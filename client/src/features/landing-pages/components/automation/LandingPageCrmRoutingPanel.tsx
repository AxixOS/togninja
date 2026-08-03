// Phase 6: CRM Routing Panel

import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Phone, MessageCircle, ShoppingBag } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface Props {
  landingPageId: string;
}

const signalIcons: Record<string, React.ReactNode> = {
  strong_buyer_intent: <ShoppingBag className="h-3 w-3 text-green-600" />,
  warm_lead: <Users className="h-3 w-3 text-blue-500" />,
  partial_intent: <Users className="h-3 w-3 text-amber-500" />,
  immediate_contact: <Phone className="h-3 w-3 text-red-500" />,
  voucher_interest: <ShoppingBag className="h-3 w-3 text-purple-500" />,
};

const strengthColors: Record<string, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-50 text-gray-600',
};

export function LandingPageCrmRoutingPanel({ landingPageId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['landing-page-crm-routing', landingPageId],
    queryFn: () => apiRequest(`/api/admin/landing-pages/${landingPageId}/crm-routing`),
    enabled: !!landingPageId,
  });

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-4 text-center">Loading CRM signals...</div>;
  }

  if (!data || data.totalSignals === 0) {
    return (
      <div className="text-xs text-gray-400 py-4 text-center">
        No lead-intent signals detected yet. Drive more traffic to generate signals.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-700">Lead Intent & CRM Signals</h3>

      {/* Score */}
      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{data.overallIntentScore}</div>
          <div className="text-[9px] text-gray-500">Intent Score</div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{data.totalSignals}</div>
          <div className="text-[9px] text-gray-500">Signals</div>
        </div>
      </div>

      {/* Signals */}
      <div className="space-y-1.5">
        {data.topSignals?.map((signal: any, i: number) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded bg-white border">
            <div className="mt-0.5">{signalIcons[signal.signalType] || <Users className="h-3 w-3 text-gray-400" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-800">{signal.label}</span>
                <Badge className={`text-[9px] px-1 py-0 ${strengthColors[signal.strength] || ''}`}>{signal.strength}</Badge>
              </div>
              <p className="text-[10px] text-gray-500">{signal.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Routing Recommendations */}
      {data.routingRecommendations?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500">Routing Suggestions</p>
          {data.routingRecommendations.map((rec: any, i: number) => (
            <div key={i} className="py-1.5 px-2 rounded bg-blue-50">
              <p className="text-xs text-blue-800 font-medium">{rec.recommendation}</p>
              <p className="text-[10px] text-blue-600">{rec.suggestedAction}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
