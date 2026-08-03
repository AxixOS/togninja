// Phase 6: Automation Rule Editor

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUTOMATION_RULE_TEMPLATES, getRuleTemplateByType } from '../../utils/landingPageAutomationRules';
import type { LandingPageAutomationRuleType, CreateLandingPageAutomationRuleInput } from '../../types/landingPageAutomation.types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateLandingPageAutomationRuleInput) => void;
  isCreating?: boolean;
}

export function LandingPageAutomationRuleEditor({ open, onClose, onCreate, isCreating }: Props) {
  const [selectedType, setSelectedType] = useState<LandingPageAutomationRuleType | ''>('');
  const [name, setName] = useState('');

  const template = selectedType ? getRuleTemplateByType(selectedType) : null;

  const handleCreate = () => {
    if (!selectedType || !template) return;
    onCreate({
      ruleType: selectedType,
      name: name.trim() || template.name,
      isEnabled: true,
      conditionJson: template.defaultCondition,
      actionJson: template.defaultAction,
      frequency: template.defaultFrequency,
    });
    setSelectedType('');
    setName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Automation Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Rule Type</Label>
            <Select value={selectedType} onValueChange={(v) => {
              setSelectedType(v as LandingPageAutomationRuleType);
              const t = getRuleTemplateByType(v as LandingPageAutomationRuleType);
              if (t) setName(t.name);
            }}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Choose a rule..." />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_RULE_TEMPLATES.map(t => (
                  <SelectItem key={t.ruleType} value={t.ruleType} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {template && (
            <>
              <p className="text-xs text-gray-500">{template.description}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={template.name}
                  className="text-xs"
                />
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <p>Checks: {template.defaultCondition.metric} {template.defaultCondition.operator} {template.defaultCondition.threshold}</p>
                <p>Frequency: {template.defaultFrequency}</p>
                <p>Action: {template.defaultAction.label}</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={!selectedType || isCreating} className="text-xs">
            {isCreating ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
