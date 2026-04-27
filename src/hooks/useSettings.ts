/**
 * Settings Hooks
 *
 * TanStack Query hooks for settings management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { sessionsKeys } from './useSessions';
import type { AppSettings } from '@/types';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
};

/**
 * Hook to fetch and manage settings
 */
export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsApi.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<AppSettings>) => settingsApi.update(newSettings),
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      // Also invalidate terminal info since preferredTerminal affects it
      queryClient.invalidateQueries({ queryKey: sessionsKeys.terminalInfo() });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
