import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import type { LandingPageFaqBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';

interface Props {
  data: LandingPageFaqBlock;
  onChange: (data: LandingPageFaqBlock) => void;
}

export default function LandingPageFaqEditor({ data, onChange }: Props) {
  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const items = [...data.items];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...data, items });
  };

  const addItem = () => {
    onChange({ ...data, items: [...data.items, { question: '', answer: '' }] });
  };

  const removeItem = (index: number) => {
    onChange({ ...data, items: data.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Section Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="Frequently Asked Questions"
      />
      <Label className="text-xs font-medium text-gray-600">Questions</Label>
      {data.items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Q{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 h-7 w-7 p-0">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input value={item.question} onChange={e => updateItem(i, 'question', e.target.value)} placeholder="Question..." className="text-sm" />
          <Textarea value={item.answer} onChange={e => updateItem(i, 'answer', e.target.value)} placeholder="Answer..." rows={2} className="text-sm resize-y" />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs gap-1">
        <Plus className="h-3 w-3" /> Add Question
      </Button>
    </div>
  );
}
