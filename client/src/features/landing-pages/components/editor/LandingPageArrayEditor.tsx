import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface LandingPageArrayEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  maxItems?: number;
}

export default function LandingPageArrayEditor({
  label,
  items,
  onChange,
  placeholder = 'Enter item...',
  addLabel = 'Add Item',
  maxItems = 20,
}: LandingPageArrayEditorProps) {
  const handleUpdate = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const handleAdd = () => {
    if (items.length >= maxItems) return;
    onChange([...items, '']);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={e => handleUpdate(i, e.target.value)}
            placeholder={placeholder}
            className="text-sm flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(i)}
            className="text-gray-400 hover:text-red-500 shrink-0 h-8 w-8 p-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {items.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
