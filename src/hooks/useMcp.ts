/**
 * MCP Hooks
 *
 * TanStack Query hooks for MCP server management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mcpApi } from '@/lib/api';
import type { AppType, CreateMcpServerInput, McpServer } from '@/types';

// Query keys
export const mcpKeys = {
  all: ['mcp'] as const,
  lists: () => [...mcpKeys.all, 'list'] as const,
  list: () => [...mcpKeys.lists()] as const,
  details: () => [...mcpKeys.all, 'detail'] as const,
  detail: (id: string) => [...mcpKeys.details(), id] as const,
  byApp: (appType: AppType) => [...mcpKeys.all, 'app', appType] as const,
};

/**
 * Hook to fetch all MCP servers
 */
export function useMcpServers() {
  return useQuery({
    queryKey: mcpKeys.list(),
    queryFn: () => mcpApi.getAll(),
  });
}

/**
 * Hook to fetch a single MCP server
 */
export function useMcpServer(id: string) {
  return useQuery({
    queryKey: mcpKeys.detail(id),
    queryFn: () => mcpApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch MCP servers for a specific app
 */
export function useMcpServersByApp(appType: AppType) {
  return useQuery({
    queryKey: mcpKeys.byApp(appType),
    queryFn: () => mcpApi.getByApp(appType),
  });
}

/**
 * Hook to create an MCP server
 */
export function useCreateMcpServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mcpApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mcpKeys.list(),
      });
    },
  });
}

/**
 * Hook to update an MCP server
 */
export function useUpdateMcpServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateMcpServerInput> }) =>
      mcpApi.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: mcpKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: mcpKeys.list(),
      });
    },
  });
}

/**
 * Hook to delete an MCP server with optimistic update
 */
export function useDeleteMcpServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mcpApi.delete(id),
    // Optimistic update - immediately remove from UI
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: mcpKeys.list() });

      // Snapshot the previous value
      const previousServers = queryClient.getQueryData<McpServer[]>(mcpKeys.list());

      // Optimistically update to the new value
      queryClient.setQueryData<McpServer[]>(mcpKeys.list(), (old) => {
        if (!old) return [];
        return old.filter((server) => server.id !== id);
      });

      // Return a context object with the snapshotted value
      return { previousServers };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _id, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(mcpKeys.list(), context.previousServers);
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: mcpKeys.list(),
      });
    },
  });
}

/**
 * Hook to toggle MCP server for an app with optimistic update
 */
export function useToggleMcpApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, appType, enabled }: { id: string; appType: AppType; enabled: boolean }) =>
      mcpApi.toggleApp(id, appType, enabled),
    // Optimistic update - immediately update UI
    onMutate: async ({
      id,
      appType,
      enabled,
    }: {
      id: string;
      appType: AppType;
      enabled: boolean;
    }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: mcpKeys.list() });

      // Snapshot the previous value
      const previousServers = queryClient.getQueryData<McpServer[]>(mcpKeys.list());

      // Optimistically update to the new value
      queryClient.setQueryData<McpServer[]>(mcpKeys.list(), (old) => {
        if (!old) return [];
        return old.map((server) => {
          if (server.id === id) {
            return {
              ...server,
              enabledApps: {
                ...server.enabledApps,
                [appType]: enabled,
              },
            };
          }
          return server;
        });
      });

      // Return a context object with the snapshotted value
      return { previousServers };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(mcpKeys.list(), context.previousServers);
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: mcpKeys.list(),
      });
    },
  });
}

/**
 * Hook to sync all MCP servers
 */
export function useSyncMcpServers() {
  return useMutation({
    mutationFn: () => mcpApi.syncAll(),
  });
}

/**
 * Hook to open config folder
 */
export function useOpenMcpConfigFolder() {
  return useMutation({
    mutationFn: (appType: AppType) => mcpApi.openConfigFolder(appType),
  });
}
