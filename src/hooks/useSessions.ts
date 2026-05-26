/**
 * Sessions Hooks
 *
 * TanStack Query hooks for session management
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api/sessions';
import type { AppType } from '@/types';

// Query keys
const sessionsKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionsKeys.all, 'list'] as const,
  list: (appType: AppType) => [...sessionsKeys.lists(), appType] as const,
  details: () => [...sessionsKeys.all, 'detail'] as const,
  detail: (appType: AppType, sessionId: string) =>
    [...sessionsKeys.details(), appType, sessionId] as const,
  stats: (appType: AppType) => [...sessionsKeys.all, 'stats', appType] as const,
  support: (appType: AppType) => [...sessionsKeys.all, 'support', appType] as const,
  terminalInfo: () => [...sessionsKeys.all, 'terminalInfo'] as const,
};

export const terminalInfoQueryKey = sessionsKeys.terminalInfo;

/**
 * Hook to fetch all sessions for an app
 */
export function useSessions(appType: AppType) {
  return useQuery({
    queryKey: sessionsKeys.list(appType),
    queryFn: () => sessionsApi.getAll(appType),
    enabled: !!appType,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch session detail
 * Auto-refetches recent sessions to show real-time updates from CLI
 */
export function useSessionDetail(sessionId: string, appType: AppType, updatedAt?: number) {
  const isRecentlyActive = updatedAt ? Date.now() - updatedAt < 30 * 60 * 1000 : false;

  return useQuery({
    queryKey: sessionsKeys.detail(appType, sessionId),
    queryFn: () => sessionsApi.getDetail(sessionId, appType),
    enabled: !!sessionId && !!appType,
    refetchInterval: isRecentlyActive ? 5000 : false,
    refetchIntervalInBackground: false, // Don't refetch when tab is in background
    refetchOnWindowFocus: isRecentlyActive,
  });
}

/**
 * Hook to fetch session stats
 */
export function useSessionStats(appType: AppType) {
  return useQuery({
    queryKey: sessionsKeys.stats(appType),
    queryFn: () => sessionsApi.getStats(appType),
    enabled: !!appType,
  });
}

/**
 * Hook to check app support status
 */
export function useSessionSupportStatus(appType: AppType) {
  return useQuery({
    queryKey: sessionsKeys.support(appType),
    queryFn: () => sessionsApi.getSupportStatus(appType),
    enabled: !!appType,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to resume a session in terminal
 */
export function useResumeSession() {
  return useMutation({
    mutationFn: ({
      sessionId,
      appType,
      workingDir,
    }: {
      sessionId: string;
      appType: AppType;
      workingDir?: string;
    }) => sessionsApi.resume(sessionId, appType, workingDir),
  });
}

/**
 * Hook to get terminal info (for UI display)
 */
export function useTerminalInfo() {
  return useQuery({
    queryKey: sessionsKeys.terminalInfo(),
    queryFn: () => sessionsApi.getTerminalInfo(),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}
