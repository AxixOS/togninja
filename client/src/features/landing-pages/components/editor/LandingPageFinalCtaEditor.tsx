import type { LandingPageFinalCtaBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageInlineTextarea from './LandingPageInlineTextarea';

interface Props {
  data: LandingPageFinalCtaBlock;
  onChange: (data: LandingPageFinalCtaBlock) => void;
}

export default function LandingPageFinalCtaEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="Final closing headline"
      />
      <LandingPageInlineTextarea
        label="Body"
        value={data.body}
        onChange={v => onChange({ ...data, body: v })}
        placeholder="Closing persuasive text"
        rows={3}
      />
      <div className="grid grid-cols-2 gap-3">
        <LandingPageInlineTextField
          label="Primary CTA"
          value={data.primaryCtaText}
          onChange={v => onChange({ ...data, primaryCtaText: v })}
          placeholder="e.g., Book Now"
        />
        <LandingPageInlineTextField
          label="Secondary CTA"
          value={data.secondaryCtaText || ''}
          onChange={v => onChange({ ...data, secondaryCtaText: v })}
          placeholder="e.g., View Packages"
        />
      </div>
    </div>
  );
}
