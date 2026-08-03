import { eq } from 'drizzle-orm';
import { db, deployments, workspaces, onboardingState, onboardingJobs } from '../db';
import { licenseService } from './license.service';

interface VercelProjectConfig {
  name: string;
  gitRepository?: {
    repo: string;
    type: 'github' | 'gitlab' | 'bitbucket';
  };
  framework?: string;
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: ('production' | 'preview' | 'development')[];
    type?: 'plain' | 'encrypted';
  }>;
}

export class DeploymentService {
  private vercelToken: string;
  private vercelTeamId?: string;
  private templateRepo: string;
  private hubUrl: string;

  constructor() {
    this.vercelToken = process.env.VERCEL_TOKEN || '';
    this.vercelTeamId = process.env.VERCEL_TEAM_ID;
    this.templateRepo = process.env.TOGNINJA_TEMPLATE_REPO || 'siparrott/togninja-template';
    this.hubUrl = process.env.HUB_PUBLIC_URL || 'https://hub.smarttog.com';
  }

  /**
   * Deploy a new workspace instance
   */
  async deployWorkspace(workspaceId: string): Promise<{
    success: boolean;
    deploymentUrl?: string;
    error?: string;
  }> {
    try {
      // Get workspace and license info
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace) {
        return { success: false, error: 'Workspace not found' };
      }

      // Get the associated deployment record
      const [deployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.workspaceId, workspaceId))
        .limit(1);

      if (!deployment) {
        return { success: false, error: 'Deployment record not found' };
      }

      // Get license key
      const licenseResult = await db.query.licenses.findFirst({
        where: (licenses, { eq }) => eq(licenses.id, workspace.licenseId)
      });

      if (!licenseResult) {
        return { success: false, error: 'License not found' };
      }

      // Update status to provisioning
      await db
        .update(deployments)
        .set({ status: 'provisioning', updatedAt: new Date() })
        .where(eq(deployments.id, deployment.id));

      await licenseService.updateOnboardingState(workspaceId, 'deploying');

      // If no Vercel token, use fallback mode
      if (!this.vercelToken) {
        console.log('⚠️ No Vercel token - using fallback deployment mode');
        return this.createFallbackDeployment(workspace, deployment, licenseResult.licenseKey);
      }

      // Create Vercel project from template
      const projectConfig: VercelProjectConfig = {
        name: workspace.slug,
        gitRepository: {
          repo: this.templateRepo,
          type: 'github'
        },
        framework: 'vite',
        environmentVariables: [
          {
            key: 'SMARTTOG_HUB_URL',
            value: this.hubUrl,
            target: ['production', 'preview'],
            type: 'plain'
          },
          {
            key: 'SMARTTOG_LICENSE_KEY',
            value: licenseResult.licenseKey,
            target: ['production', 'preview'],
            type: 'encrypted'
          },
          {
            key: 'SMARTTOG_WORKSPACE_ID',
            value: workspaceId,
            target: ['production', 'preview'],
            type: 'plain'
          },
          {
            key: 'UPDATE_CHANNEL',
            value: 'stable',
            target: ['production', 'preview'],
            type: 'plain'
          },
          {
            key: 'SETUP_MODE',
            value: 'true',
            target: ['production', 'preview'],
            type: 'plain'
          }
        ]
      };

      // Create project via Vercel API
      const createResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json',
          ...(this.vercelTeamId ? { 'x-vercel-team-id': this.vercelTeamId } : {})
        },
        body: JSON.stringify(projectConfig)
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create Vercel project: ${error}`);
      }

      const project = await createResponse.json();

      // Update deployment record
      const deploymentUrl = `https://${workspace.slug}.vercel.app`;
      
      await db
        .update(deployments)
        .set({
          status: 'deploying',
          projectId: project.id,
          teamId: this.vercelTeamId,
          url: deploymentUrl,
          envVarsSet: true,
          updatedAt: new Date()
        })
        .where(eq(deployments.id, deployment.id));

      // Trigger initial deployment
      const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json',
          ...(this.vercelTeamId ? { 'x-vercel-team-id': this.vercelTeamId } : {})
        },
        body: JSON.stringify({
          name: workspace.slug,
          project: project.id,
          gitSource: {
            type: 'github',
            repo: this.templateRepo,
            ref: 'main'
          }
        })
      });

      if (!deployResponse.ok) {
        const error = await deployResponse.text();
        console.error('Deploy trigger failed:', error);
        // Continue anyway - the project is created
      }

      // Mark as deployed (will be fully ready when first request comes in)
      await db
        .update(deployments)
        .set({
          status: 'active',
          lastDeployedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(deployments.id, deployment.id));

      await licenseService.updateOnboardingState(workspaceId, 'deployed');

      return {
        success: true,
        deploymentUrl
      };

    } catch (error) {
      console.error('Deployment error:', error);

      // Update deployment status to failed
      await db
        .update(deployments)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(deployments.workspaceId, workspaceId));

      await db
        .update(onboardingState)
        .set({
          lastError: error instanceof Error ? error.message : 'Deployment failed',
          updatedAt: new Date()
        })
        .where(eq(onboardingState.workspaceId, workspaceId));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  /**
   * Fallback deployment mode when Vercel API is not available
   * Creates a deployment record that customer can use with manual setup
   */
  private async createFallbackDeployment(
    workspace: typeof workspaces.$inferSelect,
    deployment: typeof deployments.$inferSelect,
    licenseKey: string
  ): Promise<{
    success: boolean;
    deploymentUrl?: string;
    error?: string;
  }> {
    // Generate a placeholder URL
    const deploymentUrl = `https://${workspace.slug}.vercel.app`;

    // Update deployment with manual setup instructions
    await db
      .update(deployments)
      .set({
        status: 'pending',
        url: deploymentUrl,
        errorMessage: 'Manual deployment required - Vercel API not configured',
        updatedAt: new Date()
      })
      .where(eq(deployments.id, deployment.id));

    // Still advance onboarding to deployed (they'll finish manually)
    await licenseService.updateOnboardingState(workspace.id, 'deployed');

    return {
      success: true,
      deploymentUrl
    };
  }

  /**
   * Check deployment status
   */
  async checkDeploymentStatus(workspaceId: string): Promise<{
    status: string;
    url?: string;
    ready: boolean;
  }> {
    const [deployment] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.workspaceId, workspaceId))
      .limit(1);

    if (!deployment) {
      return { status: 'not_found', ready: false };
    }

    return {
      status: deployment.status,
      url: deployment.url || undefined,
      ready: deployment.status === 'active'
    };
  }

  /**
   * Process pending deployment jobs
   */
  async processPendingJobs(): Promise<void> {
    const pendingJobs = await db
      .select()
      .from(onboardingJobs)
      .where(eq(onboardingJobs.status, 'pending'))
      .limit(5);

    for (const job of pendingJobs) {
      if (job.type === 'DEPLOY_WORKSPACE') {
        // Mark as running
        await db
          .update(onboardingJobs)
          .set({
            status: 'running',
            startedAt: new Date(),
            attempts: job.attempts + 1,
            updatedAt: new Date()
          })
          .where(eq(onboardingJobs.id, job.id));

        // Execute deployment
        const result = await this.deployWorkspace(job.workspaceId);

        // Update job status
        await db
          .update(onboardingJobs)
          .set({
            status: result.success ? 'completed' : 'failed',
            completedAt: new Date(),
            resultJson: result,
            lastError: result.error,
            updatedAt: new Date()
          })
          .where(eq(onboardingJobs.id, job.id));
      }
    }
  }
}

export const deploymentService = new DeploymentService();
