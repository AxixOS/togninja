// Phase 6: Automation Rule Card

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, Zap } from 'lucide-react';
import { LandingPageAutomationToggle } from './LandingPageAutomationToggle';
import type { LandingPageAutomationRuleRecord } from '../../types/landingPageAutomation.types';

interface Props {
  rule: LandingPageAutomationRuleRecord;
  onToggle: (ruleId: string, enabled: boolean) => void;
  onDelete: (ruleId: string) => void;
  isUpdating?: boolean;
}

export function LandingPageAutomationRuleCard({ rule, onToggle, onDelete, isUpdating }: Props) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{rule.name}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {rule.ruleType.replace(/_/g, ' ')}
            </Badge>
            {rule.frequency && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {rule.frequency}
              </span>
            )}
          </div>
          {rule.lastTriggeredAt && (
            <p className="text-[10px] text-gray-400">
              Last triggered: {new Date(rule.lastTriggeredAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LandingPageAutomationToggle
            ruleId={rule.id}
            isEnabled={rule.isEnabled}
            onToggle={onToggle}
            disabled={isUpdating}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-500"
            onClick={() => onDelete(rule.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
