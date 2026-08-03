// Variant Create Dialog — Phase 5

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLandingPageVariant } from '../../hooks/useCreateLandingPageVariant';

interface VariantCreateDialogProps {
  landingPageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const INTENTS = [
  { value: 'stronger_headline', label: 'Stronger Headline' },
  { value: 'different_cta', label: 'Different CTA' },
  { value: 'more_urgency', label: 'More Urgency' },
  { value: 'softer_tone', label: 'Softer Tone' },
  { value: 'custom', label: 'Custom' },
] as const;

export function VariantCreateDialog({
  landingPageId,
  open,
  onOpenChange,
  onCreated,
}: VariantCreateDialogProps) {
  const [name, setName] = useState('');
  const [intent, setIntent] = useState<string>('stronger_headline');

  const { createVariant, isCreating } = useCreateLandingPageVariant(landingPageId, {
    onSuccess: () => {
      setName('');
      setIntent('stronger_headline');
      onCreated();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createVariant({
      name: name.trim(),
      intent: intent as any,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create A/B Variant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="variant-name">Variant Name</Label>
            <Input
              id="variant-name"
              placeholder="e.g. Stronger headline v2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Intent</Label>
            <Select value={intent} onValueChange={setIntent}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTENTS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? 'Creating…' : 'Create Variant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
