// Phase 6: Campaign Health Card

import { Badge } from '@/components/ui/badge';
import { CheckCircle, TrendingUp, MinusCircle, AlertTriangle, PauseCircle, Moon } from 'lucide-react';
import { useLandingPageCampaignHealth } from '../../hooks/useLandingPageCampaignHealth';

interface Props {
  landingPageId: string;
}

const stateConfig: Record<string, { icon: React.ReactNode; color: string; badgeClass: string }> = {
  healthy: { icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: 'text-green-700', badgeClass: 'bg-green-50 text-green-700' },
  rising: { icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-700', badgeClass: 'bg-emerald-50 text-emerald-700' },
  stable: { icon: <MinusCircle className="h-4 w-4 text-blue-500" />, color: 'text-blue-700', badgeClass: 'bg-blue-50 text-blue-700' },
  needs_attention: { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, color: 'text-amber-700', badgeClass: 'bg-amber-50 text-amber-700' },
  stalled: { icon: <PauseCircle className="h-4 w-4 text-orange-500" />, color: 'text-orange-700', badgeClass: 'bg-orange-50 text-orange-700' },
  dormant: { icon: <Moon className="h-4 w-4 text-gray-400" />, color: 'text-gray-600', badgeClass: 'bg-gray-100 text-gray-600' },
};

export function LandingPageCampaignHealthCard({ landingPageId }: Props) {
  const { health, isLoading } = useLandingPageCampaignHealth(landingPageId);

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-4 text-center">Loading health...</div>;
  }

  if (!health) {
    return <div className="text-xs text-gray-400 py-4 text-center">No health data available.</div>;
  }

  const config = stateConfig[health.state] || stateConfig.stable;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-700">Campaign Health</h3>
      <div className="border rounded-lg p-3 bg-white">
        <div className="flex items-center gap-2 mb-2">
          {config.icon}
          <Badge className={`text-xs px-2 py-0.5 ${config.badgeClass}`}>{health.stateLabel}</Badge>
        </div>

        {health.reasons.length > 0 && (
          <ul className="text-xs text-gray-600 space-y-0.5 mb-2">
            {health.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        )}

        {health.warnings.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-amber-600 mb-0.5">Warnings</p>
            {health.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600">⚠ {w}</p>
            ))}
          </div>
        )}

        {health.opportunities.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-green-600 mb-0.5">Opportunities</p>
            {health.opportunities.map((o, i) => (
              <p key={i} className="text-xs text-green-600">✦ {o}</p>
            ))}
          </div>
        )}

        {health.recommendedNextMove && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-[10px] font-semibold text-gray-500 mb-0.5">Recommended Next Move</p>
            <p className="text-xs text-gray-800 font-medium">{health.recommendedNextMove}</p>
          </div>
        )}
      </div>
    </div>
  );
}
