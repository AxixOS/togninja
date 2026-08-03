import type { LandingPageInclusionsBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageArrayEditor from './LandingPageArrayEditor';

interface Props {
  data: LandingPageInclusionsBlock;
  onChange: (data: LandingPageInclusionsBlock) => void;
}

export default function LandingPageInclusionsEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="What's Included"
      />
      <LandingPageArrayEditor
        label="Inclusions"
        items={data.items}
        onChange={items => onChange({ ...data, items })}
        placeholder="e.g., 10 retouched digital images"
        addLabel="Add Inclusion"
      />
    </div>
  );
}
