// Phase 6: Landing Page Automation Events Server Service

/**
 * Normalize a DB event row to camelCase.
 */
export function normalizeEventRow(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    landingPageId: row.landing_page_id,
    userId: row.user_id,
    automationRuleId: row.automation_rule_id,
    eventType: row.event_type,
    eventStatus: row.event_status,
    summary: row.summary,
    detailJson: typeof row.detail_json === 'string' ? JSON.parse(row.detail_json) : row.detail_json,
    occurredAt: row.occurred_at,
  };
}

export function normalizeEventRows(rows: any[]): any[] {
  return rows.map(normalizeEventRow);
}

/**
 * Summarize recent automation activity for display.
 */
export function summarizeRecentActivity(events: any[]): {
  totalEvents: number;
  triggeredCount: number;
  lastTriggeredAt: string | null;
  recentSummaries: string[];
} {
  const triggered = events.filter(e => e.event_type === 'rule_triggered' || e.eventType === 'rule_triggered');
  return {
    totalEvents: events.length,
    triggeredCount: triggered.length,
    lastTriggeredAt: triggered[0]?.occurred_at || triggered[0]?.occurredAt || null,
    recentSummaries: events.slice(0, 5).map(e => e.summary),
  };
}
