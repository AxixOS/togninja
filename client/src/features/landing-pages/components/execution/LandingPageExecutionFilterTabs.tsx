// Phase 7: Execution Status Filter Tabs

interface Props {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts?: Record<string, number>;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'awaiting_approval', label: 'Approval' },
  { key: 'queued', label: 'Queued' },
  { key: 'running', label: 'Running' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

export function LandingPageExecutionFilterTabs({ activeFilter, onFilterChange, counts }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = filter.key === 'all' ? undefined : counts?.[filter.key];

        return (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
            {count !== undefined && count > 0 && (
              <span className={`inline-flex items-center justify-center h-4 min-w-[16px] rounded-full px-1 text-[10px] font-bold ${
                isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
