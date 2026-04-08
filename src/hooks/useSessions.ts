/**
 * Sessions Hooks
 *
 * TanStack Query hooks for session management
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api';
import type { AppType } from '@/types';

// Query keys
export const sessionsKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionsKeys.all, 'list'] as const,
  list: (appType: AppType) => [...sessionsKeys.lists(), appType] as const,
  details: () => [...sessionsKeys.all, 'detail'] as const,
  detail: (sessionId: string) => [...sessionsKeys.details(), sessionId] as const,
  stats: (appType: AppType) => [...sessionsKeys.all, 'stats', appType] as const,
  support: (appType: AppType) => [...sessionsKeys.all, 'support', appType] as const,
  terminalInfo: () => [...sessionsKeys.all, 'terminalInfo'] as const,
};

/**
 * Hook to fetch all sessions for an app
 */
export function useSessions(appType: AppType) {
  return useQuery({
    queryKey: sessionsKeys.list(appType),
    queryFn: () => sessionsApi.getAll(appType),
    enabled: !!appType,
  });
}

/**
 * Hook to fetch session detail
 */
export function useSessionDetail(sessionId: string, appType: AppType) {
  return useQuery({
    queryKey: sessionsKeys.detail(sessionId),
    queryFn: () => sessionsApi.getDetail(sessionId, appType),
    enabled: !!sessionId && !!appType,
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
  });
}
