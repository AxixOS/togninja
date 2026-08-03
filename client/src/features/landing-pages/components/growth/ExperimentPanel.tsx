// Experiment Panel — Phase 5
// Combines variant manager + performance comparison

import { VariantManager } from './VariantManager';
import { useLandingPageVariants } from '../../hooks/useLandingPageVariants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical } from 'lucide-react';

interface ExperimentPanelProps {
  landingPageId: string;
}

export function ExperimentPanel({ landingPageId }: ExperimentPanelProps) {
  const { variants } = useLandingPageVariants(landingPageId);

  const bestVariant = variants.length > 0
    ? variants.reduce((a: any, b: any) => (b.ctr > a.ctr ? b : a), variants[0])
    : null;

  return (
    <div className="space-y-4">
      {bestVariant && bestVariant.views > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <FlaskConical className="h-4 w-4 text-green-600" />
            <div className="text-sm">
              <span className="font-medium">Best performer:</span>{' '}
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                {bestVariant.name}
              </Badge>{' '}
              <span className="text-muted-foreground">
                — {(bestVariant.ctr * 100).toFixed(1)}% CTR ({bestVariant.views} views)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      <VariantManager landingPageId={landingPageId} />
    </div>
  );
}
