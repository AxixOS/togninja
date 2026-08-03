// Phase 6: Hook — Delete Landing Page Automation Rule

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLandingPageAutomationRule } from '../services/landingPageAutomation.client';

export function useDeleteLandingPageAutomationRule(landingPageId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (ruleId: string) => deleteLandingPageAutomationRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-automation-rules', landingPageId] });
    },
  });

  return {
    deleteRule: mutation.mutate,
    deleteRuleAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}
