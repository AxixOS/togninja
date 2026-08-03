// Phase 7: Execution Empty State

import { Zap } from 'lucide-react';

export function LandingPageExecutionEmptyState({ onCreateFirst }: { onCreateFirst?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Zap className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">No executions yet</h3>
      <p className="text-xs text-gray-500 max-w-xs mb-4">
        Execution actions will appear here when the automation engine suggests them,
        or you can manually dispatch actions.
      </p>
      {onCreateFirst && (
        <button
          onClick={onCreateFirst}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Queue an action
        </button>
      )}
    </div>
  );
}
