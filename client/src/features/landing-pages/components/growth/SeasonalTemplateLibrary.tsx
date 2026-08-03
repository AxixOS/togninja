// Seasonal Template Library — Phase 5

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { TemplateCard } from './TemplateCard';

interface Template {
  id: string;
  label: string;
  pageType: string;
  targetAudience: string;
}

interface SeasonalTemplateLibraryProps {
  onSelect?: (templateId: string) => void;
}

export function SeasonalTemplateLibrary({ onSelect }: SeasonalTemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/landing-pages/templates')
      .then((data: any) => setTemplates(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Seasonal Templates</h3>
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No templates available.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onSelect={() => onSelect?.(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
