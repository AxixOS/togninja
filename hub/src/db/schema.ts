import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, varchar, pgEnum } from 'drizzle-orm/pg-core';

// ==================== ENUMS ====================

export const onboardingStepEnum = pgEnum('onboarding_step', [
  'purchase_confirmed',
  'deploying',
  'deployed',
  'basics',
  'integrations',
  'scanning',
  'fix_first',
  'drafts',
  'ready'
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
]);

export const jobTypeEnum = pgEnum('job_type', [
  'DEPLOY_WORKSPACE',
  'SCAN_SITE_MAP',
  'CLASSIFY_INTENT',
  'GENERATE_FIX_FIRST_LIST',
  'GENERATE_TOP_BLUEPRINTS',
  'CREATE_WEBSITE_DRAFTS'
]);

export const licenseStatusEnum = pgEnum('license_status', [
  'active',
  'suspended',
  'expired',
  'cancelled'
]);

export const deploymentStatusEnum = pgEnum('deployment_status', [
  'pending',
  'provisioning',
  'deploying',
  'active',
  'failed',
  'suspended'
]);

export const planEnum = pgEnum('plan', [
  'starter',
  'professional',
  'enterprise'
]);

// ==================== CUSTOMERS ====================

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ==================== LICENSES ====================

export const licenses = pgTable('licenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  licenseKey: varchar('license_key', { length: 64 }).notNull().unique(),
  plan: planEnum('plan').default('starter').notNull(),
  carePlanActive: boolean('care_plan_active').default(false).notNull(),
  status: licenseStatusEnum('status').default('active').notNull(),
  expiresAt: timestamp('expires_at'),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  lastValidatedAt: timestamp('last_validated_at'),
  metadata: jsonb('metadata')
});

// ==================== WORKSPACES ====================

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  licenseId: uuid('license_id').references(() => licenses.id).notNull(),
  slug: varchar('slug', { length: 63 }).notNull().unique(), // Vercel project name limit
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ==================== DEPLOYMENTS ====================

export const deployments = pgTable('deployments', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  provider: varchar('provider', { length: 50 }).default('vercel').notNull(),
  projectId: varchar('project_id', { length: 255 }), // Vercel project ID
  teamId: varchar('team_id', { length: 255 }), // Vercel team ID
  url: varchar('url', { length: 500 }),
  customDomain: varchar('custom_domain', { length: 255 }),
  status: deploymentStatusEnum('status').default('pending').notNull(),
  lastDeployedAt: timestamp('last_deployed_at'),
  envVarsSet: boolean('env_vars_set').default(false).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ==================== ONBOARDING STATE ====================

export const onboardingState = pgTable('onboarding_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull().unique(),
  step: onboardingStepEnum('step').default('purchase_confirmed').notNull(),
  progressPct: integer('progress_pct').default(0).notNull(),
  lastError: text('last_error'),
  
  // Aggregate stats from customer instance (no PII)
  pagesScanned: integer('pages_scanned').default(0),
  fixFirstItemsCount: integer('fix_first_items_count').default(0),
  fixFirstItemsCompleted: integer('fix_first_items_completed').default(0),
  integrationsConnected: integer('integrations_connected').default(0),
  
  // Timestamps
  basicsCompletedAt: timestamp('basics_completed_at'),
  integrationsCompletedAt: timestamp('integrations_completed_at'),
  scanCompletedAt: timestamp('scan_completed_at'),
  fixFirstCompletedAt: timestamp('fix_first_completed_at'),
  draftsCompletedAt: timestamp('drafts_completed_at'),
  readyAt: timestamp('ready_at'),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ==================== ONBOARDING JOBS ====================

export const onboardingJobs = pgTable('onboarding_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  type: jobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  progress: integer('progress').default(0).notNull(),
  
  // Job-specific data (no customer PII)
  payloadJson: jsonb('payload_json'),
  resultJson: jsonb('result_json'),
  
  // Execution tracking
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  lastError: text('last_error'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ==================== AUDIT LOG ====================

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ==================== TYPE EXPORTS ====================

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
export type OnboardingState = typeof onboardingState.$inferSelect;
export type OnboardingJob = typeof onboardingJobs.$inferSelect;

export type OnboardingStep = 
  | 'purchase_confirmed'
  | 'deploying'
  | 'deployed'
  | 'basics'
  | 'integrations'
  | 'scanning'
  | 'fix_first'
  | 'drafts'
  | 'ready';

export type JobType =
  | 'DEPLOY_WORKSPACE'
  | 'SCAN_SITE_MAP'
  | 'CLASSIFY_INTENT'
  | 'GENERATE_FIX_FIRST_LIST'
  | 'GENERATE_TOP_BLUEPRINTS'
  | 'CREATE_WEBSITE_DRAFTS';
