import { Button } from '@/components/ui/button';
import { Sparkles, ChevronUp, ChevronDown, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { LandingPageSectionKey } from '../../types/landingPageEditor.types';
import { getSectionDefinition } from '../../utils/landingPageSections';

interface Props {
  sectionKey: LandingPageSectionKey;
  isVisible: boolean;
  isFirst: boolean;
  isLast: boolean;
  regenerating?: boolean;
  onRegenerate: () => void;
  onToggleVisibility: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export default function LandingPageSectionActions({
  sectionKey,
  isVisible,
  isFirst,
  isLast,
  regenerating,
  onRegenerate,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  const def = getSectionDefinition(sectionKey);

  return (
    <div className="flex items-center gap-1">
      {def?.supportsRegeneration && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 mr-1 border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 font-medium gap-1.5"
          disabled={regenerating}
          onClick={onRegenerate}
          title="Regenerate this section with AI"
        >
          <Sparkles className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Generating…' : 'Regenerate with AI'}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={isFirst}
        onClick={onMoveUp}
        title="Move up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={isLast}
        onClick={onMoveDown}
        title="Move down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {def?.supportsVisibilityToggle && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onToggleVisibility}
          title={isVisible ? 'Hide section' : 'Show section'}
        >
          {isVisible
            ? <Eye className="h-3.5 w-3.5 text-gray-500" />
            : <EyeOff className="h-3.5 w-3.5 text-gray-400" />
          }
        </Button>
      )}

      {def?.supportsRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
          title="Remove section"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
