// Phase 7: Execution Safety Badge

import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { LandingPageExecutionSafetyLevel } from '../../types/landingPageExecutionPolicy.types';

interface Props {
  safetyLevel: LandingPageExecutionSafetyLevel;
  className?: string;
}

const SAFETY_CONFIG: Record<LandingPageExecutionSafetyLevel, { icon: typeof Shield; label: string; className: string }> = {
  safe: { icon: ShieldCheck, label: 'Safe', className: 'text-green-700 bg-green-100' },
  review_required: { icon: Shield, label: 'Review Required', className: 'text-yellow-700 bg-yellow-100' },
  restricted: { icon: ShieldAlert, label: 'Restricted', className: 'text-red-700 bg-red-100' },
};

export function LandingPageExecutionSafetyBadge({ safetyLevel, className = '' }: Props) {
  const config = SAFETY_CONFIG[safetyLevel] || SAFETY_CONFIG.restricted;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className} ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
