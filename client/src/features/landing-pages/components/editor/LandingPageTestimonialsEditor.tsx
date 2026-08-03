import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import type { LandingPageTestimonialsBlock } from '../../types/landingPageGeneration.types';
import LandingPageInlineTextField from './LandingPageInlineTextField';

interface Props {
  data: LandingPageTestimonialsBlock;
  onChange: (data: LandingPageTestimonialsBlock) => void;
}

export default function LandingPageTestimonialsEditor({ data, onChange }: Props) {
  const updateItem = (index: number, field: 'quote' | 'author' | 'source', value: string) => {
    const testimonials = [...data.testimonials];
    testimonials[index] = { ...testimonials[index], [field]: value };
    onChange({ ...data, testimonials });
  };

  const addItem = () => {
    onChange({ ...data, testimonials: [...data.testimonials, { quote: '', author: '', source: '' }] });
  };

  const removeItem = (index: number) => {
    onChange({ ...data, testimonials: data.testimonials.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <LandingPageInlineTextField
        label="Section Title"
        value={data.title}
        onChange={v => onChange({ ...data, title: v })}
        placeholder="What Our Clients Say"
      />
      <Label className="text-xs font-medium text-gray-600">Testimonials</Label>
      {data.testimonials.map((t, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Testimonial {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 h-7 w-7 p-0">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea value={t.quote} onChange={e => updateItem(i, 'quote', e.target.value)} placeholder="Client testimonial..." rows={2} className="text-sm resize-y" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={t.author || ''} onChange={e => updateItem(i, 'author', e.target.value)} placeholder="Name" className="text-sm" />
            <Input value={t.source || ''} onChange={e => updateItem(i, 'source', e.target.value)} placeholder="Context (e.g., Google Review)" className="text-sm" />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs gap-1">
        <Plus className="h-3 w-3" /> Add Testimonial
      </Button>
    </div>
  );
}
