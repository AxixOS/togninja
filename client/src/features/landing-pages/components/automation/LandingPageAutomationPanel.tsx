// Phase 6: Main Automation Panel — orchestrates all automation sub-panels

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Play, RefreshCw } from 'lucide-react';
import { useLandingPageAutomationRules } from '../../hooks/useLandingPageAutomationRules';
import { useCreateLandingPageAutomationRule } from '../../hooks/useCreateLandingPageAutomationRule';
import { useUpdateLandingPageAutomationRule } from '../../hooks/useUpdateLandingPageAutomationRule';
import { useDeleteLandingPageAutomationRule } from '../../hooks/useDeleteLandingPageAutomationRule';
import { runLandingPageAutomation } from '../../services/landingPageAutomation.client';
import { LandingPageAutomationRuleCard } from './LandingPageAutomationRuleCard';
import { LandingPageAutomationRuleEditor } from './LandingPageAutomationRuleEditor';
import { LandingPageAutomationEmptyState } from './LandingPageAutomationEmptyState';
import { LandingPageCampaignHealthCard } from './LandingPageCampaignHealthCard';
import { LandingPageRecommendationPanel } from './LandingPageRecommendationPanel';
import { LandingPageAutomationEventLog } from './LandingPageAutomationEventLog';
import { LandingPageScheduledActionsPanel } from './LandingPageScheduledActionsPanel';
import { LandingPageCrmRoutingPanel } from './LandingPageCrmRoutingPanel';
import type { CreateLandingPageAutomationRuleInput } from '../../types/landingPageAutomation.types';

interface Props {
  landingPageId: string;
}

export function LandingPageAutomationPanel({ landingPageId }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const { rules, isLoading } = useLandingPageAutomationRules(landingPageId);
  const { createRule, isCreating } = useCreateLandingPageAutomationRule(landingPageId);
  const { updateRule, isUpdating } = useUpdateLandingPageAutomationRule(landingPageId);
  const { deleteRule } = useDeleteLandingPageAutomationRule(landingPageId);

  const handleToggle = (ruleId: string, enabled: boolean) => {
    updateRule({ ruleId, payload: { isEnabled: enabled } });
  };

  const handleDelete = (ruleId: string) => {
    deleteRule(ruleId);
  };

  const handleCreate = (input: CreateLandingPageAutomationRuleInput) => {
    createRule(input);
  };

  const handleRunAutomation = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const result = await runLandingPageAutomation(landingPageId);
      setRunResult(result);
    } catch {
      setRunResult({ error: "We couldn't evaluate this automation just now." });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Health */}
      <LandingPageCampaignHealthCard landingPageId={landingPageId} />

      {/* Recommendations */}
      <LandingPageRecommendationPanel landingPageId={landingPageId} />

      {/* Automation Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700">Automation Rules</h3>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={handleRunAutomation}
              disabled={isRunning || rules.length === 0}
            >
              {isRunning ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {isRunning ? 'Running...' : 'Run Now'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => setEditorOpen(true)}
            >
              <Plus className="h-3 w-3" /> Add Rule
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-xs text-gray-400 py-4 text-center">Loading rules...</div>
        ) : rules.length === 0 ? (
          <LandingPageAutomationEmptyState onEnable={() => setEditorOpen(true)} />
        ) : (
          <div className="space-y-2">
            {rules.map((rule: any) => (
              <LandingPageAutomationRuleCard
                key={rule.id}
                rule={{
                  id: rule.id,
                  landingPageId: rule.landing_page_id || rule.landingPageId,
                  userId: rule.user_id || rule.userId,
                  ruleType: rule.rule_type || rule.ruleType,
                  name: rule.name,
                  isEnabled: rule.is_enabled ?? rule.isEnabled ?? true,
                  conditionJson: typeof rule.condition_json === 'string' ? JSON.parse(rule.condition_json) : (rule.condition_json || rule.conditionJson || {}),
                  actionJson: typeof rule.action_json === 'string' ? JSON.parse(rule.action_json) : (rule.action_json || rule.actionJson || {}),
                  frequency: rule.frequency,
                  lastEvaluatedAt: rule.last_evaluated_at || rule.lastEvaluatedAt,
                  lastTriggeredAt: rule.last_triggered_at || rule.lastTriggeredAt,
                  createdAt: rule.created_at || rule.createdAt,
                  updatedAt: rule.updated_at || rule.updatedAt,
                }}
                onToggle={handleToggle}
                onDelete={handleDelete}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}

        {/* Run result feedback */}
        {runResult && !runResult.error && (
          <div className="text-xs p-2 bg-blue-50 rounded border border-blue-100">
            <p className="text-blue-800 font-medium">
              Evaluated {runResult.evaluatedCount} rule{runResult.evaluatedCount !== 1 ? 's' : ''},{' '}
              {runResult.triggeredCount} triggered.
            </p>
            {runResult.recommendationUpdates?.length > 0 && (
              <ul className="mt-1 text-blue-700">
                {runResult.recommendationUpdates.map((r: string, i: number) => <li key={i}>• {r}</li>)}
              </ul>
            )}
          </div>
        )}
        {runResult?.error && (
          <p className="text-xs text-red-600 p-2 bg-red-50 rounded">{runResult.error}</p>
        )}
      </div>

      {/* Event Log */}
      <LandingPageAutomationEventLog landingPageId={landingPageId} />

      {/* Scheduled Actions */}
      <LandingPageScheduledActionsPanel landingPageId={landingPageId} />

      {/* CRM Routing */}
      <LandingPageCrmRoutingPanel landingPageId={landingPageId} />

      {/* Rule Editor Dialog */}
      <LandingPageAutomationRuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
}
