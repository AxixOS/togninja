// Phase 6: Landing Page Automation Rules Server Service
// Encapsulates rule CRUD logic for use from routes or background jobs.

export interface RuleCreateInput {
  landingPageId: string;
  userId: string;
  ruleType: string;
  name: string;
  isEnabled?: boolean;
  conditionJson?: Record<string, unknown>;
  actionJson?: Record<string, unknown>;
  frequency?: string | null;
}

export interface RuleUpdateInput {
  name?: string;
  isEnabled?: boolean;
  conditionJson?: Record<string, unknown>;
  actionJson?: Record<string, unknown>;
  frequency?: string | null;
  lastEvaluatedAt?: string;
  lastTriggeredAt?: string;
}

/**
 * Validate rule creation input.
 */
export function validateRuleInput(input: Partial<RuleCreateInput>): { valid: boolean; error?: string } {
  if (!input.ruleType) return { valid: false, error: 'ruleType is required.' };
  if (!input.name || input.name.trim().length === 0) return { valid: false, error: 'name is required.' };
  return { valid: true };
}

/**
 * Normalize DB row to camelCase for client consumption.
 */
export function normalizeRuleRow(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    landingPageId: row.landing_page_id,
    userId: row.user_id,
    ruleType: row.rule_type,
    name: row.name,
    isEnabled: row.is_enabled,
    conditionJson: typeof row.condition_json === 'string' ? JSON.parse(row.condition_json) : row.condition_json,
    actionJson: typeof row.action_json === 'string' ? JSON.parse(row.action_json) : row.action_json,
    frequency: row.frequency,
    lastEvaluatedAt: row.last_evaluated_at,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeRuleRows(rows: any[]): any[] {
  return rows.map(normalizeRuleRow);
}
