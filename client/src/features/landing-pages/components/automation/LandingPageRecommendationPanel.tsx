// Phase 6: Recommendation Panel

import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useLandingPageRecommendations } from '../../hooks/useLandingPageRecommendations';

interface Props {
  landingPageId: string;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  medium: 'bg-blue-50 text-blue-700',
  low: 'bg-gray-50 text-gray-600',
};

export function LandingPageRecommendationPanel({ landingPageId }: Props) {
  const { recommendations, isLoading } = useLandingPageRecommendations(landingPageId);

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-4 text-center">Loading recommendations...</div>;
  }

  const recs = recommendations?.recommendations ?? [];

  if (recs.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-4 text-center">
        No signals yet — this campaign needs more traffic before we can suggest improvements.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-700">Recommended Next Actions</h3>
      <div className="space-y-2">
        {recs.map((rec: any, i: number) => (
          <div key={rec.id || i} className="border rounded-lg p-3 bg-white">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-gray-900">{rec.title}</span>
                  <Badge className={`text-[9px] px-1 py-0 ${priorityColors[rec.priority] || ''}`}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{rec.description}</p>
                {rec.reasoning && (
                  <p className="text-[10px] text-gray-400 mt-0.5 italic">{rec.reasoning}</p>
                )}
                {rec.actionLabel && (
                  <button className="mt-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    {rec.actionLabel} <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
