import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronUp, ChevronDown, Sparkles, Trash2, Eye, EyeOff, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { LandingPageSectionKey, LandingPageSectionVisibilityMap, LandingPageSectionAlignmentMap, LandingPageSectionAlignment } from '../../types/landingPageEditor.types';
import { LANDING_PAGE_SECTION_DEFINITIONS } from '../../utils/landingPageSections';
import { getSectionDefinition } from '../../utils/landingPageSections';

// Sections whose alignment control makes no visual difference (a full-bleed
// image band / logo strip) are excluded from the alignment control.
const NO_ALIGN: LandingPageSectionKey[] = ['hero', 'trustBar'];

interface Props {
  sectionOrder: LandingPageSectionKey[];
  visibility: LandingPageSectionVisibilityMap;
  alignment: LandingPageSectionAlignmentMap;
  activeSection: LandingPageSectionKey | null;
  onSelect: (key: LandingPageSectionKey) => void;
  onToggleVisibility: (key: LandingPageSectionKey) => void;
  onSetAlignment: (key: LandingPageSectionKey, align: LandingPageSectionAlignment) => void;
  onRegenerate: (key: LandingPageSectionKey) => void;
}

export default function LandingPageSectionSidebar({
  sectionOrder,
  visibility,
  alignment,
  activeSection,
  onSelect,
  onToggleVisibility,
  onSetAlignment,
  onRegenerate,
}: Props) {
  const alignOptions: Array<{ value: LandingPageSectionAlignment; Icon: typeof AlignLeft; title: string }> = [
    { value: 'left', Icon: AlignLeft, title: 'Align left' },
    { value: 'center', Icon: AlignCenter, title: 'Align center' },
    { value: 'right', Icon: AlignRight, title: 'Align right' },
  ];
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Sections</h3>
      {sectionOrder.map(key => {
        const def = getSectionDefinition(key);
        if (!def) return null;
        const isVisible = visibility[key];
        const isActive = activeSection === key;

        const currentAlign: LandingPageSectionAlignment = alignment[key] ?? 'center';
        const canAlign = key !== 'seo' && !NO_ALIGN.includes(key);

        return (
          <div
            key={key}
            className={`rounded-md transition-colors ${
              isActive ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
            } ${!isVisible ? 'opacity-50' : ''}`}
          >
            <div
              className="group flex items-center gap-2 px-2 py-1.5 cursor-pointer"
              onClick={() => onSelect(key)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{def.label}</p>
              </div>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {def.supportsRegeneration && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={e => { e.stopPropagation(); onRegenerate(key); }}
                    title="Regenerate"
                  >
                    <Sparkles className="h-3 w-3 text-purple-500" />
                  </Button>
                )}
                {def.supportsVisibilityToggle && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={e => { e.stopPropagation(); onToggleVisibility(key); }}
                    title={isVisible ? 'Hide section' : 'Show section'}
                  >
                    {isVisible
                      ? <Eye className="h-3 w-3 text-gray-400" />
                      : <EyeOff className="h-3 w-3 text-gray-400" />
                    }
                  </Button>
                )}
              </div>

              {def.required && (
                <span className="text-[10px] text-purple-500 font-medium">REQ</span>
              )}
            </div>

            {/* Alignment control — shown for the active section. Overrides the
                default centred layout for this section on the public page. */}
            {isActive && canAlign && (
              <div className="flex items-center gap-1 px-2 pb-2 pt-0.5">
                <span className="text-[10px] text-gray-400 mr-1">Align</span>
                {alignOptions.map(({ value, Icon, title }) => (
                  <button
                    key={value}
                    type="button"
                    title={title}
                    onClick={e => { e.stopPropagation(); onSetAlignment(key, value); }}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                      currentAlign === value
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
