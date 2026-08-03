import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2 } from 'lucide-react';

interface LandingPagesEmptyStateProps {
  onCreateNew: () => void;
}

export function LandingPagesEmptyState({ onCreateNew }: LandingPagesEmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <Sparkles className="h-12 w-12 text-purple-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Create your first landing page
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Start with a simple draft now. AI-assisted generation, editing, and publishing will
        build on this foundation in the next phase.
      </p>
      <Button onClick={onCreateNew} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
        <Wand2 className="h-4 w-4" />
        Create Your First Landing Page
      </Button>
    </Card>
  );
}
