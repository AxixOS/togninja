import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

interface LandingPagesHeaderProps {
  onCreateNew: () => void;
}

export function LandingPagesHeader({ onCreateNew }: LandingPagesHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="h-8 w-8 text-purple-600" />
          Landing Pages
        </h1>
        <p className="text-gray-500 mt-1">
          Create focused campaign pages for offers, seasonal promotions, vouchers, and lead capture.
        </p>
      </div>
      <Button onClick={onCreateNew} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
        <Plus className="h-4 w-4" />
        Create New Landing Page
      </Button>
    </div>
  );
}
