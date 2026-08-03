// Phase 6: Dormant Campaign Card

import { Moon, RefreshCw, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  landingPageId: string;
  state: string;
  publishedDaysAgo?: number;
}

export function LandingPageDormantCampaignCard({ landingPageId, state, publishedDaysAgo }: Props) {
  if (state !== 'dormant' && state !== 'stalled') return null;

  return (
    <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
      <div className="flex items-start gap-2">
        <Moon className="h-4 w-4 text-amber-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-amber-800 mb-0.5">
            {state === 'dormant' ? 'Dormant Campaign' : 'Stalled Campaign'}
          </h4>
          <p className="text-xs text-amber-700 mb-2">
            {state === 'dormant'
              ? `This page has had no traffic${publishedDaysAgo ? ` for ${publishedDaysAgo} days` : ''}. Consider relaunching or archiving it.`
              : 'Traffic and engagement are dropping. Time to take action.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-100">
              <RefreshCw className="h-3 w-3" /> Relaunch
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1 text-gray-500 hover:text-gray-700">
              <Archive className="h-3 w-3" /> Archive
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
