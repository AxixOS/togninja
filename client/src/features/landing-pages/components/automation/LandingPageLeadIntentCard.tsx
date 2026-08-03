// Phase 6: Lead Intent Card

import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

interface Props {
  intentScore: number;
  totalSignals: number;
  topSignalLabel?: string;
}

export function LandingPageLeadIntentCard({ intentScore, totalSignals, topSignalLabel }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-green-600';
    if (score >= 30) return 'text-amber-600';
    return 'text-gray-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 60) return 'Strong';
    if (score >= 30) return 'Moderate';
    return 'Weak';
  };

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs font-semibold text-gray-700">Lead Intent</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className={`text-xl font-bold ${getScoreColor(intentScore)}`}>{intentScore}</div>
          <div className="text-[9px] text-gray-500">Score</div>
        </div>
        <div className="flex-1 space-y-1">
          <Badge className={`text-[9px] px-1.5 py-0 ${intentScore >= 60 ? 'bg-green-50 text-green-700' : intentScore >= 30 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}`}>
            {getScoreLabel(intentScore)}
          </Badge>
          <p className="text-[10px] text-gray-500">{totalSignals} signal{totalSignals !== 1 ? 's' : ''} detected</p>
          {topSignalLabel && <p className="text-[10px] text-gray-400">Top: {topSignalLabel}</p>}
        </div>
      </div>
    </div>
  );
}
