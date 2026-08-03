// Clone Winning Campaign Dialog — Phase 5

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
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { LANDING_PAGES_QUERY_KEY } from '../../hooks/useLandingPages';

interface CloneWinningCampaignDialogProps {
  landingPageId: string;
  landingPageName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloned?: (newId: string) => void;
}

export function CloneWinningCampaignDialog({
  landingPageId,
  landingPageName,
  open,
  onOpenChange,
  onCloned,
}: CloneWinningCampaignDialogProps) {
  const [newName, setNewName] = useState(`${landingPageName} (Copy)`);
  const [cloning, setCloning] = useState(false);
  const qc = useQueryClient();

  async function handleClone() {
    setCloning(true);
    try {
      const result: any = await apiRequest(
        `/api/admin/landing-pages/${landingPageId}/duplicate`,
        { method: 'POST' },
      );
      qc.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      onOpenChange(false);
      onCloned?.(result.id);
    } catch {
      alert('Failed to clone landing page');
    } finally {
      setCloning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Duplicate &ldquo;{landingPageName}&rdquo; as a new landing page. Perfect for
            re-running a winning campaign with fresh dates.
          </p>
          <div className="space-y-2">
            <Label htmlFor="clone-name">New Name</Label>
            <Input
              id="clone-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={cloning}>
            {cloning ? 'Cloning…' : 'Clone Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
