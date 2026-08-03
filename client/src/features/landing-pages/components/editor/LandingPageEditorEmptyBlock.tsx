import { FileText, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  sectionLabel: string;
  /** One-click AI generation for the empty section (opens/triggers regeneration). */
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export default function LandingPageEditorEmptyBlock({ sectionLabel, onGenerate, isGenerating }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
      <FileText className="h-8 w-8 text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">No {sectionLabel} content yet</p>
      {onGenerate ? (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isGenerating ? 'Generating…' : 'Generate with AI'}
        </button>
      ) : (
        <p className="text-xs text-gray-300 mt-1">Use AI regeneration (✨) to generate this section</p>
      )}
    </div>
  );
}
