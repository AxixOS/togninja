import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { LANDING_PAGE_STATUSES, LANDING_PAGE_SORT_OPTIONS } from '../utils/landingPage.constants';
import type { LandingPageListFilters, LandingPageStatus } from '../types/landingPage.types';

interface LandingPageFiltersProps {
  filters: LandingPageListFilters;
  onChange: (filters: LandingPageListFilters) => void;
  statusCounts: Record<string, number>;
}

export function LandingPageFilters({ filters, onChange, statusCounts }: LandingPageFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by title, slug, or service..."
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {LANDING_PAGE_STATUSES.map(({ value, label }) => (
          <Button
            key={value}
            variant={filters.status === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ ...filters, status: value as LandingPageStatus | 'all' })}
            className={filters.status === value ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {label} ({statusCounts[value] ?? 0})
          </Button>
        ))}
      </div>

      {/* Sort */}
      <Select
        value={filters.sortBy ?? 'updated_at'}
        onValueChange={(v) => onChange({ ...filters, sortBy: v as LandingPageListFilters['sortBy'] })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANDING_PAGE_SORT_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
