// Phase 6: Hook — Update Landing Page Automation Rule

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLandingPageAutomationRule } from '../services/landingPageAutomation.client';
import type { UpdateLandingPageAutomationRuleInput } from '../types/landingPageAutomation.types';

export function useUpdateLandingPageAutomationRule(landingPageId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: UpdateLandingPageAutomationRuleInput }) =>
      updateLandingPageAutomationRule(ruleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-automation-rules', landingPageId] });
    },
  });

  return {
    updateRule: mutation.mutate,
    updateRuleAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
