// Variant Manager — Phase 5

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useLandingPageVariants } from '../../hooks/useLandingPageVariants';
import { VariantCard } from './VariantCard';
import { VariantCreateDialog } from './VariantCreateDialog';

interface VariantManagerProps {
  landingPageId: string;
}

export function VariantManager({ landingPageId }: VariantManagerProps) {
  const { variants, isLoading, refetch } = useLandingPageVariants(landingPageId);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">A/B Variants</h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Variant
        </Button>
      </div>

      {variants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No variants yet. Create one to start A/B testing different headlines, CTAs, or offers.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {variants.map((v: any) => (
            <VariantCard
              key={v.id}
              variant={v}
              onUpdated={refetch}
            />
          ))}
        </div>
      )}

      <VariantCreateDialog
        landingPageId={landingPageId}
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => {
          setShowCreate(false);
          refetch();
        }}
      />
    </div>
  );
}
