import type { LandingPageRevisionRecord } from '../../types/landingPageRevision.types';
import { Clock } from 'lucide-react';

interface Props {
  revisions: LandingPageRevisionRecord[];
  isLoading: boolean;
}

export default function LandingPageRevisionPanel({ revisions, isLoading }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Revision History</h3>

      {isLoading && (
        <p className="text-xs text-gray-400">Loading revisions...</p>
      )}

      {!isLoading && revisions.length === 0 && (
        <p className="text-xs text-gray-400">No revisions yet. Revisions are created when you save changes.</p>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {revisions.map(rev => (
          <div key={rev.id} className="flex items-start gap-2 border rounded p-2 bg-gray-50">
            <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">v{rev.version_number}</span>
                <span className="text-xs text-gray-400">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
              {rev.note && <p className="text-xs text-gray-500 truncate">{rev.note}</p>}
            </div>
            {/* TODO: Phase 3+ — add restore button */}
          </div>
        ))}
      </div>
    </div>
  );
}
