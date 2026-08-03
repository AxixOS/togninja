// Phase 7: Execution Settings Panel

import { Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { LandingPageExecutionSettingsRecord, UpdateLandingPageExecutionSettingsInput } from '../../types/landingPageExecution.types';

interface Props {
  settings: LandingPageExecutionSettingsRecord | null;
  isLoading: boolean;
  onUpdate: (payload: UpdateLandingPageExecutionSettingsInput) => void;
  isUpdating?: boolean;
}

export function LandingPageExecutionSettingsPanel({ settings, isLoading, onUpdate, isUpdating }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded w-full" />
          <div className="h-8 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  const autoExecute = settings?.autoExecuteSafeActions ?? false;
  const requireContent = settings?.requireApprovalForContentChanges ?? true;
  const requireCrm = settings?.requireApprovalForCrmPushes ?? true;
  const requireVariant = settings?.requireApprovalForVariantCreation ?? true;

  const items = [
    {
      id: 'auto-execute',
      label: 'Auto-execute safe actions',
      description: 'Automatically run low-risk actions (promo pack, social posts, follow-up tasks).',
      checked: autoExecute,
      onToggle: (checked: boolean) => onUpdate({ autoExecuteSafeActions: checked }),
    },
    {
      id: 'require-content',
      label: 'Require approval for content changes',
      description: 'Variants, CTA refreshes, and headline changes need manual approval.',
      checked: requireContent,
      onToggle: (checked: boolean) => onUpdate({ requireApprovalForContentChanges: checked }),
    },
    {
      id: 'require-crm',
      label: 'Require approval for CRM pushes',
      description: 'Lead signals and CRM movements need explicit sign-off.',
      checked: requireCrm,
      onToggle: (checked: boolean) => onUpdate({ requireApprovalForCrmPushes: checked }),
    },
    {
      id: 'require-variant',
      label: 'Require approval for variant creation',
      description: 'New page variants and seasonal clones need approval.',
      checked: requireVariant,
      onToggle: (checked: boolean) => onUpdate({ requireApprovalForVariantCreation: checked }),
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">Execution Settings</h3>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
            <Switch
              checked={item.checked}
              onCheckedChange={item.onToggle}
              disabled={isUpdating}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
