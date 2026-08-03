import type { LandingPageWhyChooseUsBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageArrayEditor from './LandingPageArrayEditor';

interface Props {
  data: LandingPageWhyChooseUsBlock;
  onChange: (data: LandingPageWhyChooseUsBlock) => void;
}

export default function LandingPageWhyChooseUsEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="Why Choose Us"
      />
      <LandingPageArrayEditor
        label="Points"
        items={data.points}
        onChange={points => onChange({ ...data, points })}
        placeholder="Differentiator or unique point..."
        addLabel="Add Point"
      />
    </div>
  );
}
