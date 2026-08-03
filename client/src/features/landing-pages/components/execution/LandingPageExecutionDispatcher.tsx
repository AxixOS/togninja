// Phase 7: Execution Action Dispatcher — UI for manually queueing actions

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { EXECUTION_TYPES } from '../../utils/landingPageExecution.constants';
import type { LandingPageExecutionType } from '../../types/landingPageExecution.types';

interface Props {
  onDispatch: (executionType: string, payload?: Record<string, unknown>) => void;
  isDispatching?: boolean;
}

export function LandingPageExecutionDispatcher({ onDispatch, isDispatching }: Props) {
  const [selectedType, setSelectedType] = useState<LandingPageExecutionType | ''>('');

  const handleDispatch = () => {
    if (!selectedType) return;
    onDispatch(selectedType);
    setSelectedType('');
  };

  const types = Object.entries(EXECUTION_TYPES) as [LandingPageExecutionType, { label: string; description: string; icon: string }][];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">Dispatch Action</h3>
      </div>

      <div className="space-y-3">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as LandingPageExecutionType | '')}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select an action...</option>
          {types.map(([type, meta]) => (
            <option key={type} value={type}>
              {meta.label}
            </option>
          ))}
        </select>

        {selectedType && (
          <p className="text-xs text-gray-500">
            {EXECUTION_TYPES[selectedType]?.description}
          </p>
        )}

        <Button
          variant="default"
          size="sm"
          disabled={!selectedType || isDispatching}
          onClick={handleDispatch}
          className="w-full"
        >
          {isDispatching ? 'Dispatching...' : 'Queue Action'}
        </Button>
      </div>
    </div>
  );
}
