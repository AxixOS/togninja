import { useEffect, useRef } from 'react';
import type { LandingPageSectionKey, LandingPageSectionVisibilityMap, LandingPageSectionOrder } from '../../types/landingPageEditor.types';
import type { LandingPageGeneratedContent } from '../../types/landingPageGeneration.types';
import LandingPageSectionCard from './LandingPageSectionCard';
import LandingPageEditorEmptyBlock from './LandingPageEditorEmptyBlock';
import LandingPageArrayEditor from './LandingPageArrayEditor';
import LandingPageHeroEditor from './LandingPageHeroEditor';
import LandingPageOfferEditor from './LandingPageOfferEditor';
import LandingPageProblemEditor from './LandingPageProblemEditor';
import LandingPageBenefitsEditor from './LandingPageBenefitsEditor';
import LandingPageWhyChooseUsEditor from './LandingPageWhyChooseUsEditor';
import LandingPageInclusionsEditor from './LandingPageInclusionsEditor';
import LandingPageTestimonialsEditor from './LandingPageTestimonialsEditor';
import LandingPageFaqEditor from './LandingPageFaqEditor';
import LandingPageFinalCtaEditor from './LandingPageFinalCtaEditor';
import { getSectionDefinition } from '../../utils/landingPageSections';

interface Props {
  content: LandingPageGeneratedContent;
  sectionOrder: LandingPageSectionKey[];
  visibility: LandingPageSectionVisibilityMap;
  activeSection: LandingPageSectionKey | null;
  regeneratingSection?: LandingPageSectionKey | null;
  onActivateSection: (key: LandingPageSectionKey) => void;
  onUpdateSection: (key: LandingPageSectionKey, data: unknown) => void;
  onMoveSectionUp: (key: LandingPageSectionKey) => void;
  onMoveSectionDown: (key: LandingPageSectionKey) => void;
  onToggleVisibility: (key: LandingPageSectionKey) => void;
  onRemoveSection: (key: LandingPageSectionKey) => void;
  onRegenerate: (key: LandingPageSectionKey) => void;
  /** Generate an EMPTY section directly (no mode dialog). */
  onGenerateDirect: (key: LandingPageSectionKey) => void;
}

/** Maps a section key to the corresponding editor component */
function renderSectionEditor(
  key: LandingPageSectionKey,
  content: LandingPageGeneratedContent,
  onUpdate: (data: unknown) => void,
  onGenerate: () => void,
  isGenerating: boolean,
): React.ReactNode {
  const def = getSectionDefinition(key);
  const empty = (label: string) => (
    <LandingPageEditorEmptyBlock
      sectionLabel={label}
      onGenerate={onGenerate}
      isGenerating={isGenerating}
    />
  );

  switch (key) {
    case 'hero':
      return content.hero
        ? <LandingPageHeroEditor data={content.hero} onChange={onUpdate} />
        : empty(def?.label ?? 'Hero');

    case 'offerSection':
      return content.offerSection
        ? <LandingPageOfferEditor data={content.offerSection} onChange={onUpdate} />
        : empty(def?.label ?? 'Offer');

    case 'problemSection':
      return content.problemSection
        ? <LandingPageProblemEditor data={content.problemSection} onChange={onUpdate} />
        : empty(def?.label ?? 'Problem');

    case 'benefits':
      return content.benefits
        ? <LandingPageBenefitsEditor data={content.benefits} onChange={onUpdate} />
        : empty(def?.label ?? 'Benefits');

    case 'whyChooseUs':
      return content.whyChooseUs
        ? <LandingPageWhyChooseUsEditor data={content.whyChooseUs} onChange={onUpdate} />
        : empty(def?.label ?? 'Why Choose Us');

    case 'inclusions':
      return content.inclusions
        ? <LandingPageInclusionsEditor data={content.inclusions} onChange={onUpdate} />
        : empty(def?.label ?? 'Inclusions');

    case 'testimonials':
      return content.testimonials
        ? <LandingPageTestimonialsEditor data={content.testimonials} onChange={onUpdate} />
        : empty(def?.label ?? 'Testimonials');

    case 'faq':
      return content.faq
        ? <LandingPageFaqEditor data={content.faq} onChange={onUpdate} />
        : empty(def?.label ?? 'FAQ');

    case 'finalCta':
      return content.finalCta
        ? <LandingPageFinalCtaEditor data={content.finalCta} onChange={onUpdate} />
        : empty(def?.label ?? 'Final CTA');

    case 'trustBar': {
      // Previously ALWAYS showed the empty block — trust-bar content was
      // uneditable and looked "not generated" even when it existed.
      const tb = content.trustBar as { items?: string[] } | undefined;
      return tb?.items?.length
        ? (
          <LandingPageArrayEditor
            label="Trust points (shown as a bar under the hero)"
            items={tb.items}
            onChange={(items) => onUpdate({ ...tb, items })}
            placeholder="e.g., Seit 2012 in Wien tätig"
            addLabel="Add trust point"
            maxItems={6}
          />
        )
        : empty('Trust Bar');
    }

    case 'seo':
      // SEO is handled separately in the right panel
      return null;

    default:
      return null;
  }
}

export default function LandingPageEditorCanvas({
  content,
  sectionOrder,
  visibility,
  activeSection,
  regeneratingSection,
  onActivateSection,
  onUpdateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onToggleVisibility,
  onRemoveSection,
  onRegenerate,
  onGenerateDirect,
}: Props) {
  // Filter out seo from the canvas — it's in the right panel
  const canvasSections = sectionOrder.filter(k => k !== 'seo');

  // Scroll the canvas to the selected section. Clicking a section in the left
  // sidebar sets activeSection; without this it only highlighted the card.
  const sectionRefs = useRef<Partial<Record<LandingPageSectionKey, HTMLDivElement | null>>>({});
  useEffect(() => {
    if (!activeSection) return;
    const el = sectionRefs.current[activeSection];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeSection]);

  return (
    <div className="space-y-4">
      {canvasSections.map((key, idx) => (
        <div key={key} ref={el => { sectionRefs.current[key] = el; }} className="scroll-mt-4">
          <LandingPageSectionCard
            sectionKey={key}
            isVisible={visibility[key]}
            isFirst={idx === 0}
            isLast={idx === canvasSections.length - 1}
            isActive={activeSection === key}
            regenerating={regeneratingSection === key}
            onActivate={() => onActivateSection(key)}
            onRegenerate={() => onRegenerate(key)}
            onToggleVisibility={() => onToggleVisibility(key)}
            onMoveUp={() => onMoveSectionUp(key)}
            onMoveDown={() => onMoveSectionDown(key)}
            onRemove={() => onRemoveSection(key)}
          >
            {renderSectionEditor(
              key,
              content,
              data => onUpdateSection(key, data),
              () => onGenerateDirect(key), // empty-state "Generate with AI" → direct, no dialog
              regeneratingSection === key,
            )}
          </LandingPageSectionCard>
        </div>
      ))}
    </div>
  );
}
