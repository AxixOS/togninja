// Template Card — Phase 5

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2 } from 'lucide-react';

interface TemplateCardProps {
  template: {
    id: string;
    label: string;
    pageType: string;
    targetAudience: string;
  };
  onSelect: () => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{template.label}</p>
            <div className="flex gap-1.5 mt-1">
              <Badge variant="secondary" className="text-xs">
                {template.pageType.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.targetAudience.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onSelect}>
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
