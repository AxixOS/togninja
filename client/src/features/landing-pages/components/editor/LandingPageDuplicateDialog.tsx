import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDuplicating: boolean;
  pageTitle: string;
}

export default function LandingPageDuplicateDialog({ open, onClose, onConfirm, isDuplicating, pageTitle }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Duplicate Landing Page
          </DialogTitle>
          <DialogDescription>
            Create a copy you can tweak without affecting the current draft.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          This will create a copy of <span className="font-medium">"{pageTitle}"</span> as a new draft.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDuplicating}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isDuplicating} className="gap-2">
            {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
