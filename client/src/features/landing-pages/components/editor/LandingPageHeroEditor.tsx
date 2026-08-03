import type { LandingPageHeroBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageInlineTextarea from './LandingPageInlineTextarea';

interface Props {
  data: LandingPageHeroBlock;
  onChange: (data: LandingPageHeroBlock) => void;
}

export default function LandingPageHeroEditor({ data, onChange }: Props) {
  const update = (field: keyof LandingPageHeroBlock, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Importance flags mirror the server publish validation: headline +
          primary CTA block publishing; subheadline strongly recommended. */}
      <LandingPageInlineTextField
        label="Eyebrow"
        value={data.eyebrow || ''}
        onChange={v => update('eyebrow', v)}
        placeholder="e.g., Limited Time Offer"
        importance="optional"
        helperText="Small kicker line above the headline — nice to have, not needed."
      />
      <LandingPageInlineTextField
        label="Headline"
        value={data.headline}
        onChange={v => update('headline', v)}
        placeholder="Your main headline"
        importance="required"
      />
      <LandingPageInlineTextarea
        label="Subheadline"
        value={data.subheadline}
        onChange={v => update('subheadline', v)}
        placeholder="Supporting text (2-3 sentences)"
        rows={3}
        importance="recommended"
      />
      <div className="grid grid-cols-2 gap-3">
        <LandingPageInlineTextField
          label="Primary CTA"
          value={data.primaryCtaText}
          onChange={v => update('primaryCtaText', v)}
          placeholder="e.g., Book Now"
          importance="required"
        />
        <LandingPageInlineTextField
          label="Secondary CTA"
          value={data.secondaryCtaText || ''}
          onChange={v => update('secondaryCtaText', v)}
          placeholder="e.g., Learn More"
          importance="optional"
        />
      </div>
      <LandingPageInlineTextField
        label="Badge Text"
        value={data.badgeText || ''}
        onChange={v => update('badgeText', v)}
        placeholder="e.g., 🌸 Spring Special"
        importance="optional"
      />
    </div>
  );
}
