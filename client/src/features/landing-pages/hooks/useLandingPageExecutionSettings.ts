// Phase 7: Hook — Landing Page Execution Settings

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLandingPageExecutionSettings, updateLandingPageExecutionSettings } from '../services/landingPageExecution.client';
import type { UpdateLandingPageExecutionSettingsInput } from '../types/landingPageExecution.types';

export function useLandingPageExecutionSettings(landingPageId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['landing-page-execution-settings', landingPageId],
    queryFn: () => getLandingPageExecutionSettings(landingPageId),
    enabled: !!landingPageId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateLandingPageExecutionSettingsInput) =>
      updateLandingPageExecutionSettings(landingPageId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-execution-settings', landingPageId] });
    },
  });

  return {
    settings: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateSettings: updateMutation.mutate,
    updateSettingsAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
