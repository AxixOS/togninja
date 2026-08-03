import type { LandingPageProblemBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';
import LandingPageArrayEditor from './LandingPageArrayEditor';

interface Props {
  data: LandingPageProblemBlock;
  onChange: (data: LandingPageProblemBlock) => void;
}

export default function LandingPageProblemEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="Agitation headline"
      />
      <LandingPageArrayEditor
        label="Paragraphs / Pain Points"
        items={data.paragraphs}
        onChange={paragraphs => onChange({ ...data, paragraphs })}
        placeholder="Describe a pain point..."
        addLabel="Add Paragraph"
      />
    </div>
  );
}
