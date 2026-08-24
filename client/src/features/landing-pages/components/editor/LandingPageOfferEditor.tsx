import type { LandingPageOfferBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageInlineTextarea from './LandingPageInlineTextarea';
import LandingPageArrayEditor from './LandingPageArrayEditor';
import { useStudioCurrency } from '@/hooks/useStudioCurrency';

interface Props {
  data: LandingPageOfferBlock;
  onChange: (data: LandingPageOfferBlock) => void;
}

export default function LandingPageOfferEditor({ data, onChange }: Props) {
  // The example price has to be in the currency the studio sells in. A currency symbol
  // written into the placeholder hinted at money a Shreveport photographer never quotes in.
  const { format: money } = useStudioCurrency();

  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="Offer headline"
      />
      <LandingPageInlineTextarea
        label="Introduction"
        value={data.intro || ''}
        onChange={v => onChange({ ...data, intro: v })}
        placeholder="Describe the offer compellingly"
        rows={3}
      />
      <LandingPageArrayEditor
        label="Bullets / Inclusions"
        items={data.bullets}
        onChange={bullets => onChange({ ...data, bullets })}
        placeholder="What's included..."
        addLabel="Add Bullet"
      />
      <div className="grid grid-cols-2 gap-3">
        <LandingPageInlineTextField
          label="Price"
          value={data.price || ''}
          onChange={v => onChange({ ...data, price: v })}
          placeholder={`e.g., ${money(225)}`}
        />
        <LandingPageInlineTextField
          label="Urgency"
          value={data.urgency || ''}
          onChange={v => onChange({ ...data, urgency: v })}
          placeholder="e.g., Only 5 spots left"
        />
      </div>
    </div>
  );
}
