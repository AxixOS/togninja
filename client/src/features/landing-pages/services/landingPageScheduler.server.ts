// Phase 6: Landing Page Scheduler Server Service
// Scaffolds scheduled action management for future cron/job integration.

export interface ScheduleCreateInput {
  landingPageId: string;
  userId: string;
  actionType: string;
  actionPayload?: Record<string, unknown>;
  scheduledFor: string;
}

/**
 * Validate a scheduled action input.
 */
export function validateScheduledActionInput(input: Partial<ScheduleCreateInput>): { valid: boolean; error?: string } {
  if (!input.actionType) return { valid: false, error: 'actionType is required.' };
  if (!input.scheduledFor) return { valid: false, error: 'scheduledFor is required.' };
  const date = new Date(input.scheduledFor);
  if (isNaN(date.getTime())) return { valid: false, error: 'scheduledFor must be a valid date.' };
  return { valid: true };
}

/**
 * Normalize a scheduled action DB row to camelCase.
 */
export function normalizeScheduledActionRow(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    landingPageId: row.landing_page_id,
    userId: row.user_id,
    actionType: row.action_type,
    actionPayload: typeof row.action_payload === 'string' ? JSON.parse(row.action_payload) : row.action_payload,
    scheduledFor: row.scheduled_for,
    status: row.status,
    executedAt: row.executed_at,
    createdAt: row.created_at,
  };
}

export function normalizeScheduledActionRows(rows: any[]): any[] {
  return rows.map(normalizeScheduledActionRow);
}

/**
 * Check if a scheduled action is due for execution.
 */
export function isActionDue(action: { scheduledFor: string; status: string }): boolean {
  if (action.status !== 'pending') return false;
  return new Date(action.scheduledFor).getTime() <= Date.now();
}

/**
 * Build a human-readable description for a scheduled action type.
 */
export function describeScheduledAction(actionType: string): string {
  switch (actionType) {
    case 'promo_reminder': return 'Reminder to promote this page';
    case 'promo_pack_refresh': return 'Generate fresh promo content';
    case 'seasonal_relaunch': return 'Relaunch seasonal campaign';
    case 'dormant_check': return 'Check dormant campaign status';
    case 'performance_review': return 'Review campaign performance';
    default: return actionType.replace(/_/g, ' ');
  }
}
