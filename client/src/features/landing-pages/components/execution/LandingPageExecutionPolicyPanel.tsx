// Phase 7: Execution Policy Overview Panel

import { Shield } from 'lucide-react';
import { EXECUTION_POLICIES } from '../../utils/landingPageExecutionPolicies';
import { LandingPageExecutionSafetyBadge } from './LandingPageExecutionSafetyBadge';
import type { LandingPageExecutionType } from '../../types/landingPageExecution.types';

export function LandingPageExecutionPolicyPanel() {
  const policies = Object.values(EXECUTION_POLICIES);

  const grouped = {
    safe: policies.filter((p) => p.safetyLevel === 'safe'),
    review_required: policies.filter((p) => p.safetyLevel === 'review_required'),
    restricted: policies.filter((p) => p.safetyLevel === 'restricted'),
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">Execution Policies</h3>
      </div>

      {(Object.entries(grouped) as [string, typeof policies][]).map(([level, items]) => (
        items.length > 0 && (
          <div key={level} className="mb-4 last:mb-0">
            <div className="mb-2">
              <LandingPageExecutionSafetyBadge safetyLevel={level as any} />
            </div>
            <div className="space-y-1">
              {items.map((policy) => (
                <div key={policy.executionType} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-700">{policy.label}</span>
                  <span className="text-[10px] text-gray-400">
                    {policy.canAutoExecute ? 'Auto' : 'Manual'} · {policy.maxRetries} retries
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
