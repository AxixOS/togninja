import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, customers, licenses, workspaces, deployments, onboardingState, onboardingJobs, auditLog } from '../db';
import type { OnboardingStep, JobType } from '../db/schema';

/**
 * Generate a secure license key
 * Format: TGNJA-XXXXX-XXXXX-XXXXX-XXXXX (32 chars + dashes)
 */
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
  let key = 'TGNJA';
  for (let i = 0; i < 4; i++) {
    key += '-';
    for (let j = 0; j < 5; j++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return key;
}

/**
 * Generate a URL-safe workspace slug
 */
function generateSlug(baseName: string): string {
  const base = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

export class LicenseService {
  
  /**
   * Process a successful Stripe checkout
   * Creates customer, license, workspace, and starts onboarding
   */
  async processCheckoutSuccess(params: {
    stripeCustomerId: string;
    email: string;
    name?: string;
    plan: 'starter' | 'professional' | 'enterprise';
    carePlanActive?: boolean;
    metadata?: Record<string, any>;
  }): Promise<{
    customer: typeof customers.$inferSelect;
    license: typeof licenses.$inferSelect;
    workspace: typeof workspaces.$inferSelect;
    deployment: typeof deployments.$inferSelect;
  }> {
    
    // 1. Create or update customer
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, params.email))
      .limit(1);
    
    let customer: typeof customers.$inferSelect;
    
    if (existingCustomer.length > 0) {
      // Update existing customer with Stripe ID
      const [updated] = await db
        .update(customers)
        .set({
          stripeCustomerId: params.stripeCustomerId,
          name: params.name || existingCustomer[0].name,
          updatedAt: new Date()
        })
        .where(eq(customers.id, existingCustomer[0].id))
        .returning();
      customer = updated;
    } else {
      // Create new customer
      const [created] = await db
        .insert(customers)
        .values({
          email: params.email,
          name: params.name,
          stripeCustomerId: params.stripeCustomerId
        })
        .returning();
      customer = created;
    }
    
    // 2. Issue license
    const licenseKey = generateLicenseKey();
    const [license] = await db
      .insert(licenses)
      .values({
        customerId: customer.id,
        licenseKey,
        plan: params.plan,
        carePlanActive: params.carePlanActive || false,
        status: 'active',
        metadata: params.metadata
      })
      .returning();
    
    // 3. Create workspace
    const slug = generateSlug(params.name || params.email.split('@')[0]);
    const [workspace] = await db
      .insert(workspaces)
      .values({
        customerId: customer.id,
        licenseId: license.id,
        slug,
        name: params.name || `${params.email.split('@')[0]}'s Workspace`,
        status: 'pending'
      })
      .returning();
    
    // 4. Create deployment record (pending)
    const [deployment] = await db
      .insert(deployments)
      .values({
        workspaceId: workspace.id,
        provider: 'vercel',
        status: 'pending'
      })
      .returning();
    
    // 5. Initialize onboarding state
    await db
      .insert(onboardingState)
      .values({
        workspaceId: workspace.id,
        step: 'purchase_confirmed',
        progressPct: 5
      });
    
    // 6. Create deployment job
    await db
      .insert(onboardingJobs)
      .values({
        workspaceId: workspace.id,
        type: 'DEPLOY_WORKSPACE',
        status: 'pending',
        payloadJson: {
          slug: workspace.slug,
          licenseKey: license.licenseKey
        }
      });
    
    // 7. Audit log
    await db
      .insert(auditLog)
      .values({
        customerId: customer.id,
        workspaceId: workspace.id,
        action: 'checkout_completed',
        details: {
          plan: params.plan,
          carePlanActive: params.carePlanActive
        }
      });
    
    return { customer, license, workspace, deployment };
  }
  
  /**
   * Validate a license key
   */
  async validateLicense(licenseKey: string): Promise<{
    valid: boolean;
    license?: typeof licenses.$inferSelect;
    workspace?: typeof workspaces.$inferSelect;
    error?: string;
  }> {
    const [license] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1);
    
    if (!license) {
      return { valid: false, error: 'License not found' };
    }
    
    if (license.status !== 'active') {
      return { valid: false, error: `License is ${license.status}` };
    }
    
    if (license.expiresAt && license.expiresAt < new Date()) {
      return { valid: false, error: 'License has expired' };
    }
    
    // Update last validated timestamp
    await db
      .update(licenses)
      .set({ lastValidatedAt: new Date() })
      .where(eq(licenses.id, license.id));
    
    // Get workspace
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.licenseId, license.id))
      .limit(1);
    
    return { valid: true, license, workspace };
  }
  
  /**
   * Update onboarding state
   */
  async updateOnboardingState(
    workspaceId: string,
    step: OnboardingStep,
    additionalData?: Partial<typeof onboardingState.$inferInsert>
  ): Promise<void> {
    const progressMap: Record<OnboardingStep, number> = {
      'purchase_confirmed': 5,
      'deploying': 15,
      'deployed': 25,
      'basics': 40,
      'integrations': 55,
      'scanning': 70,
      'fix_first': 85,
      'drafts': 95,
      'ready': 100
    };
    
    const timestampField = `${step.replace('_', '')}CompletedAt`;
    
    await db
      .update(onboardingState)
      .set({
        step,
        progressPct: progressMap[step],
        updatedAt: new Date(),
        ...(step === 'ready' ? { readyAt: new Date() } : {}),
        ...additionalData
      })
      .where(eq(onboardingState.workspaceId, workspaceId));
  }
  
  /**
   * Create an onboarding job
   */
  async createJob(
    workspaceId: string,
    type: JobType,
    payload?: Record<string, any>
  ): Promise<typeof onboardingJobs.$inferSelect> {
    const [job] = await db
      .insert(onboardingJobs)
      .values({
        workspaceId,
        type,
        status: 'pending',
        payloadJson: payload
      })
      .returning();
    
    return job;
  }
  
  /**
   * Get workspace by slug
   */
  async getWorkspaceBySlug(slug: string): Promise<{
    workspace: typeof workspaces.$inferSelect;
    deployment: typeof deployments.$inferSelect;
    onboarding: typeof onboardingState.$inferSelect;
  } | null> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);
    
    if (!workspace) return null;
    
    const [deployment] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.workspaceId, workspace.id))
      .limit(1);
    
    const [onboarding] = await db
      .select()
      .from(onboardingState)
      .where(eq(onboardingState.workspaceId, workspace.id))
      .limit(1);
    
    return { workspace, deployment, onboarding };
  }
  
  /**
   * Get pending jobs for processing
   */
  async getPendingJobs(limit: number = 10): Promise<(typeof onboardingJobs.$inferSelect)[]> {
    return db
      .select()
      .from(onboardingJobs)
      .where(eq(onboardingJobs.status, 'pending'))
      .limit(limit);
  }
}

export const licenseService = new LicenseService();
