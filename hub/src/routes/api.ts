import { Router, Request, Response } from 'express';
import { licenseService } from '../services/license.service';
import { deploymentService } from '../services/deployment.service';
import { stripeWebhookService } from '../services/stripe-webhook.service';
import { db, customers, workspaces, deployments, onboardingState, licenses } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

// ==================== STRIPE WEBHOOK ====================

router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  try {
    const event = stripeWebhookService.verifySignature(req.body, signature);
    const result = await stripeWebhookService.handleWebhook(event);
    
    res.json({ received: true, ...result });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook verification failed'
    });
  }
});

// ==================== LICENSE VALIDATION ====================

router.post('/license/validate', async (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ valid: false, error: 'License key required' });
    }
    
    const result = await licenseService.validateLicense(licenseKey);
    res.json(result);
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'License validation failed'
    });
  }
});

// ==================== WORKSPACE ENDPOINTS ====================

router.get('/workspace/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const result = await licenseService.getWorkspaceBySlug(slug);
    
    if (!result) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    res.json({
      workspace: {
        id: result.workspace.id,
        slug: result.workspace.slug,
        name: result.workspace.name,
        status: result.workspace.status
      },
      deployment: {
        url: result.deployment.url,
        status: result.deployment.status,
        provider: result.deployment.provider
      },
      onboarding: {
        step: result.onboarding.step,
        progressPct: result.onboarding.progressPct,
        lastError: result.onboarding.lastError
      }
    });
  } catch (error) {
    console.error('Workspace fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

router.get('/workspace/:slug/status', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    const deploymentStatus = await deploymentService.checkDeploymentStatus(workspace.id);
    
    const [onboarding] = await db
      .select()
      .from(onboardingState)
      .where(eq(onboardingState.workspaceId, workspace.id))
      .limit(1);
    
    res.json({
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        status: workspace.status
      },
      deployment: deploymentStatus,
      onboarding: onboarding ? {
        step: onboarding.step,
        progressPct: onboarding.progressPct,
        stats: {
          pagesScanned: onboarding.pagesScanned,
          fixFirstItems: onboarding.fixFirstItemsCount,
          fixFirstCompleted: onboarding.fixFirstItemsCompleted,
          integrationsConnected: onboarding.integrationsConnected
        }
      } : null
    });
  } catch (error) {
    console.error('Status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// ==================== ONBOARDING PROGRESS REPORTING ====================

router.post('/workspace/:workspaceId/onboarding/progress', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { licenseKey, step, stats } = req.body;
    
    // Validate license
    const licenseResult = await licenseService.validateLicense(licenseKey);
    if (!licenseResult.valid) {
      return res.status(401).json({ error: 'Invalid license' });
    }
    
    // Update onboarding state
    if (step) {
      await licenseService.updateOnboardingState(workspaceId, step, stats);
    } else if (stats) {
      // Just update stats without changing step
      await db
        .update(onboardingState)
        .set({
          ...stats,
          updatedAt: new Date()
        })
        .where(eq(onboardingState.workspaceId, workspaceId));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ==================== DEPLOYMENT MANAGEMENT ====================

router.post('/deployment/:workspaceId/trigger', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { licenseKey } = req.body;
    
    // Validate license
    const licenseResult = await licenseService.validateLicense(licenseKey);
    if (!licenseResult.valid) {
      return res.status(401).json({ error: 'Invalid license' });
    }
    
    const result = await deploymentService.deployWorkspace(workspaceId);
    res.json(result);
  } catch (error) {
    console.error('Deployment trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger deployment' });
  }
});

router.get('/deployment/:workspaceId/status', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const status = await deploymentService.checkDeploymentStatus(workspaceId);
    res.json(status);
  } catch (error) {
    console.error('Deployment status error:', error);
    res.status(500).json({ error: 'Failed to check deployment status' });
  }
});

// ==================== HEALTH CHECK ====================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;
