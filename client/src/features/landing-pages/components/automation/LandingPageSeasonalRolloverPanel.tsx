// Phase 6: Seasonal Rollover Panel

import { CalendarDays, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SeasonalSuggestion {
  season: string;
  suggestedNewTitle: string;
  suggestedLaunchMonth: number;
  suggestedLaunchYear: number;
  reasoning: string;
  actionLabel: string;
}

interface Props {
  suggestions: SeasonalSuggestion[];
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function LandingPageSeasonalRolloverPanel({ suggestions }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-700">Seasonal Rollover</h3>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="border rounded-lg p-3 bg-white">
            <div className="flex items-start gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-gray-900">{s.season}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {monthNames[s.suggestedLaunchMonth - 1]} {s.suggestedLaunchYear}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{s.reasoning}</p>
                <button className="mt-1.5 text-[11px] font-medium text-purple-600 hover:text-purple-700 flex items-center gap-0.5">
                  {s.actionLabel} <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
