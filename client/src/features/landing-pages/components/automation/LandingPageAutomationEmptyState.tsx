// Phase 6: Automation Empty State

import { Bot } from 'lucide-react';

export function LandingPageAutomationEmptyState({ onEnable }: { onEnable?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Bot className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">No automations active yet</h3>
      <p className="text-xs text-gray-500 max-w-xs mb-4">
        Enable simple rules to monitor campaign performance and suggest what to do next.
      </p>
      {onEnable && (
        <button
          onClick={onEnable}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Set Up Automation
        </button>
      )}
    </div>
  );
}
