// Variant Card — Phase 5

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteLandingPageVariant } from '../../services/landingPageVariants.client';
import { useState } from 'react';

interface VariantCardProps {
  variant: {
    id: string;
    name: string;
    variant_key: string;
    status: string;
    traffic_weight: number;
    views: number;
    clicks: number;
    ctr: number;
  };
  onUpdated: () => void;
}

export function VariantCard({ variant, onUpdated }: VariantCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete variant "${variant.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteLandingPageVariant(variant.id);
      onUpdated();
    } catch {
      alert('Failed to delete variant');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{variant.name}</span>
            <Badge variant="outline" className="text-xs">
              {variant.variant_key}
            </Badge>
            <Badge
              variant="outline"
              className={
                variant.status === 'active'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }
            >
              {variant.status}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>{variant.views} views</span>
          <span>{variant.clicks} clicks</span>
          <span>{(variant.ctr * 100).toFixed(1)}% CTR</span>
          <span>{variant.traffic_weight}% traffic</span>
        </div>
      </CardContent>
    </Card>
  );
}
