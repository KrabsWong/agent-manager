/**
 * Prompt Hooks
 * 
 * TanStack Query hooks for prompt management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi } from '@/lib/api';
import type { AppType, CreatePromptInput } from '@/types';

// Query key
const QUERY_KEY = 'prompts';

/**
 * Hook to fetch all prompts for an app
 */
export function usePrompts(appType: AppType) {
  return useQuery({
    queryKey: [QUERY_KEY, appType],
    queryFn: () => promptsApi.getAll(appType),
  });
}

/**
 * Hook to fetch the active prompt for an app
 */
export function useActivePrompt(appType: AppType) {
  return useQuery({
    queryKey: [QUERY_KEY, 'active', appType],
    queryFn: () => promptsApi.getActive(appType),
  });
}

/**
 * Hook to create a prompt
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: promptsApi.create,
    onSuccess: (data) => {
      // Invalidate prompts list and active prompt for the app
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, data.appType],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'active', data.appType],
      });
    },
  });
}

/**
 * Hook to update a prompt
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      appType,
      input,
    }: {
      id: string;
      appType: AppType;
      input: Partial<CreatePromptInput>;
    }) => promptsApi.update(id, appType, input),
    onSuccess: (data) => {
      // Invalidate queries for the app's prompts
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, data.appType],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'active', data.appType],
      });
    },
  });
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, appType }: { id: string; appType: AppType }) =>
      promptsApi.delete(id, appType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.appType],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'active', variables.appType],
      });
    },
  });
}

/**
 * Hook to set active prompt
 */
export function useSetActivePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, appType }: { id: string; appType: AppType }) =>
      promptsApi.setActive(id, appType),
    onSuccess: (_, variables) => {
      // Invalidate both prompts list and active prompt queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.appType],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'active', variables.appType],
      });
    },
  });
}

/**
 * Hook to import prompt from app
 */
export function useImportPromptFromApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appType, name }: { appType: AppType; name?: string }) =>
      promptsApi.importFromApp(appType, name),
    onSuccess: (_, variables) => {
      // Invalidate prompts list for the app
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.appType],
      });
    },
  });
}

/**
 * Hook to sync all prompts
 */
export function useSyncAllPrompts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: promptsApi.syncAll,
    onSuccess: () => {
      // Invalidate all prompt queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
  });
}
