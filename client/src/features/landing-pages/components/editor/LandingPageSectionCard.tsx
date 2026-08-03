import type { LandingPageSectionKey } from '../../types/landingPageEditor.types';
import { getSectionDefinition } from '../../utils/landingPageSections';
import LandingPageSectionActions from './LandingPageSectionActions';

interface Props {
  sectionKey: LandingPageSectionKey;
  isVisible: boolean;
  isFirst: boolean;
  isLast: boolean;
  isActive: boolean;
  regenerating?: boolean;
  onActivate: () => void;
  onRegenerate: () => void;
  onToggleVisibility: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

export default function LandingPageSectionCard({
  sectionKey,
  isVisible,
  isFirst,
  isLast,
  isActive,
  regenerating,
  onActivate,
  onRegenerate,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: Props) {
  const def = getSectionDefinition(sectionKey);

  return (
    <div
      id={`section-${sectionKey}`}
      className={`rounded-lg border bg-white shadow-sm transition-all ${
        isActive ? 'ring-2 ring-purple-300 shadow-md' : 'ring-0'
      } ${!isVisible ? 'opacity-50 bg-gray-50' : ''}`}
      onClick={onActivate}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50/60">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">{def?.label ?? sectionKey}</h3>
          {!isVisible && (
            <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Hidden</span>
          )}
          {def?.required && (
            <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Required</span>
          )}
        </div>

        <LandingPageSectionActions
          sectionKey={sectionKey}
          isVisible={isVisible}
          isFirst={isFirst}
          isLast={isLast}
          regenerating={regenerating}
          onRegenerate={onRegenerate}
          onToggleVisibility={onToggleVisibility}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      </div>

      {/* Section body */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
