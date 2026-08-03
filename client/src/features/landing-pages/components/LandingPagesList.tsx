import { Card, CardContent } from '@/components/ui/card';
import { FileText, Globe, Clock, Archive } from 'lucide-react';
import { LandingPageCard } from './LandingPageCard';
import { LandingPageFilters } from './LandingPageFilters';
import { LandingPagesEmptyState } from './LandingPagesEmptyState';
import type { LandingPageRecord, LandingPageListFilters } from '../types/landingPage.types';

interface LandingPagesListProps {
  pages: LandingPageRecord[];
  filters: LandingPageListFilters;
  onFiltersChange: (filters: LandingPageListFilters) => void;
  statusCounts: Record<string, number>;
  isLoading: boolean;
  onEdit: (page: LandingPageRecord) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onCreateNew: () => void;
}

export function LandingPagesList({
  pages,
  filters,
  onFiltersChange,
  statusCounts,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  onPublish,
  onUnpublish,
  onCreateNew,
}: LandingPagesListProps) {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Pages', count: statusCounts.all ?? 0, icon: FileText, color: 'text-gray-600 bg-gray-50' },
          { label: 'Published', count: statusCounts.published ?? 0, icon: Globe, color: 'text-green-600 bg-green-50' },
          { label: 'Drafts', count: statusCounts.draft ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Archived', count: statusCounts.archived ?? 0, icon: Archive, color: 'text-gray-400 bg-gray-50' },
        ].map(stat => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <LandingPageFilters filters={filters} onChange={onFiltersChange} statusCounts={statusCounts} />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : pages.length === 0 ? (
        <LandingPagesEmptyState onCreateNew={onCreateNew} />
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <LandingPageCard
              key={page.id}
              page={page}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
            />
          ))}
        </div>
      )}

      {/* TODO: add pagination if needed later */}
      {/* TODO: add analytics counts later */}
    </div>
  );
}
