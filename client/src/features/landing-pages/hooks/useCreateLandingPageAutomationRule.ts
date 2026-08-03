// Phase 6: Hook — Create Landing Page Automation Rule

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLandingPageAutomationRule } from '../services/landingPageAutomation.client';
import type { CreateLandingPageAutomationRuleInput } from '../types/landingPageAutomation.types';

export function useCreateLandingPageAutomationRule(landingPageId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateLandingPageAutomationRuleInput) =>
      createLandingPageAutomationRule(landingPageId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-automation-rules', landingPageId] });
    },
  });

  return {
    createRule: mutation.mutate,
    createRuleAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
