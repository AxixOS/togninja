import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LandingPageInlineTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  rows?: number;
  maxLength?: number;
  /** Field importance: required = blocks publishing; recommended = strongly improves conversion. */
  importance?: 'required' | 'recommended' | 'optional';
}

const IMPORTANCE_BADGE: Record<string, { text: string; cls: string }> = {
  required: { text: 'Required', cls: 'bg-red-100 text-red-700' },
  recommended: { text: 'Recommended', cls: 'bg-amber-100 text-amber-700' },
  optional: { text: 'Optional', cls: 'bg-gray-100 text-gray-500' },
};

export default function LandingPageInlineTextarea({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  rows = 3,
  maxLength,
  importance,
}: LandingPageInlineTextareaProps) {
  const badge = importance ? IMPORTANCE_BADGE[importance] : null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">
        {label}
        {badge && (
          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </Label>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="text-sm resize-y"
      />
      {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
      {maxLength && (
        <p className="text-xs text-gray-400 text-right">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}
