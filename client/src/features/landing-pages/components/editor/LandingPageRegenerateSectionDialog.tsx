import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import type { LandingPageSectionKey } from '../../types/landingPageEditor.types';
import type { LandingPageSectionRegenerationMode } from '../../types/landingPageRegeneration.types';
import { getSectionDefinition } from '../../utils/landingPageSections';

const REGENERATION_MODES: { value: LandingPageSectionRegenerationMode; label: string }[] = [
  { value: 'improve', label: 'Improve' },
  { value: 'rewrite', label: 'Rewrite' },
  { value: 'shorten', label: 'Shorten' },
  { value: 'make-more-direct', label: 'Make More Direct' },
  { value: 'make-more-emotional', label: 'Make More Emotional' },
  { value: 'localize', label: 'Localize' },
  { value: 'seo-refresh', label: 'SEO Refresh' },
  { value: 'custom-instruction', label: 'Custom Instruction' },
];

interface Props {
  open: boolean;
  sectionKey: LandingPageSectionKey | null;
  onClose: () => void;
  onConfirm: (mode: LandingPageSectionRegenerationMode, customInstruction?: string) => void;
  isRegenerating: boolean;
}

export default function LandingPageRegenerateSectionDialog({ open, sectionKey, onClose, onConfirm, isRegenerating }: Props) {
  const [mode, setMode] = useState<LandingPageSectionRegenerationMode>('improve');
  const [customInstruction, setCustomInstruction] = useState('');

  const sectionDef = sectionKey ? getSectionDefinition(sectionKey) : null;

  const handleConfirm = () => {
    onConfirm(mode, mode === 'custom-instruction' ? customInstruction : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Regenerate Section
          </DialogTitle>
          <DialogDescription>
            Refresh this section while keeping the rest of the page intact.
          </DialogDescription>
        </DialogHeader>

        {sectionDef && (
          <p className="text-sm text-gray-600">
            Regenerating: <span className="font-medium">{sectionDef.label}</span>
          </p>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Mode</Label>
            <Select value={mode} onValueChange={(v: LandingPageSectionRegenerationMode) => setMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGENERATION_MODES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'custom-instruction' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Your Instruction</Label>
              <Textarea
                value={customInstruction}
                onChange={e => setCustomInstruction(e.target.value)}
                placeholder="e.g., Make it warmer and more premium"
                rows={3}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isRegenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isRegenerating || (mode === 'custom-instruction' && !customInstruction.trim())}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
