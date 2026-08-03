// Phase 6: Automation Toggle

import { Switch } from '@/components/ui/switch';

interface Props {
  ruleId: string;
  isEnabled: boolean;
  onToggle: (ruleId: string, enabled: boolean) => void;
  disabled?: boolean;
}

export function LandingPageAutomationToggle({ ruleId, isEnabled, onToggle, disabled }: Props) {
  return (
    <Switch
      checked={isEnabled}
      onCheckedChange={(checked) => onToggle(ruleId, checked)}
      disabled={disabled}
      className="data-[state=checked]:bg-blue-600"
    />
  );
}
