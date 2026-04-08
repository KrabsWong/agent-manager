/**
 * Provider Hooks
 * 
 * TanStack Query hooks for provider management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi } from '@/lib/api';
import type { AppType, CreateProviderInput } from '@/types';

// Query keys
export const providerKeys = {
  all: ['providers'] as const,
  byApp: (appType: AppType) => [...providerKeys.all, appType] as const,
  byId: (id: string, appType: AppType) => [...providerKeys.byApp(appType), id] as const,
};

/**
 * Hook to fetch all providers for an app
 */
export function useProviders(appType: AppType) {
  return useQuery({
    queryKey: providerKeys.byApp(appType),
    queryFn: () => providersApi.getAll(appType),
  });
}

/**
 * Hook to fetch a single provider
 */
export function useProvider(id: string, appType: AppType) {
  return useQuery({
    queryKey: providerKeys.byId(id, appType),
    queryFn: () => providersApi.getById(id, appType),
    enabled: !!id,
  });
}

/**
 * Hook to create a provider
 */
export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: providersApi.create,
    onSuccess: (data) => {
      // Invalidate providers list for the app
      queryClient.invalidateQueries({
        queryKey: providerKeys.byApp(data.appType),
      });
    },
  });
}

/**
 * Hook to update a provider
 */
export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      appType,
      input,
    }: {
      id: string;
      appType: AppType;
      input: Partial<CreateProviderInput>;
    }) => providersApi.update(id, appType, input),
    onSuccess: (data) => {
      // Invalidate specific provider and list
      queryClient.invalidateQueries({
        queryKey: providerKeys.byId(data.id, data.appType),
      });
      queryClient.invalidateQueries({
        queryKey: providerKeys.byApp(data.appType),
      });
    },
  });
}

/**
 * Hook to delete a provider
 */
export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, appType }: { id: string; appType: AppType }) =>
      providersApi.delete(id, appType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: providerKeys.byApp(variables.appType),
      });
    },
  });
}

/**
 * Hook to switch provider
 */
export function useSwitchProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, appType }: { id: string; appType: AppType }) =>
      providersApi.switch(id, appType),
    onSuccess: (_, variables) => {
      // Invalidate all providers for the app to refresh current state
      queryClient.invalidateQueries({
        queryKey: providerKeys.byApp(variables.appType),
      });
    },
  });
}

/**
 * Hook to reorder providers
 */
export function useReorderProviders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appType, providerIds }: { appType: AppType; providerIds: string[] }) =>
      providersApi.reorder(appType, providerIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: providerKeys.byApp(variables.appType),
      });
    },
  });
}
