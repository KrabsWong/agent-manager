import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proxyApi } from '@/lib/api';
import type { AppType } from '@/types';

const PROXY_KEY = 'proxy';

// Query hooks
export function useProxyStatus() {
  return useQuery({
    queryKey: [PROXY_KEY, 'status'],
    queryFn: () => proxyApi.getStatus(),
  });
}

export function useCircuitBreakerStats() {
  return useQuery({
    queryKey: [PROXY_KEY, 'circuitBreaker'],
    queryFn: () => proxyApi.getCircuitBreakerStats(),
  });
}

export function useFailoverStatus() {
  return useQuery({
    queryKey: [PROXY_KEY, 'failover'],
    queryFn: () => proxyApi.getFailoverStatus(),
  });
}

export function useUsageStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [PROXY_KEY, 'usage', startDate, endDate],
    queryFn: () => proxyApi.getUsageStats(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useTodayStats() {
  return useQuery({
    queryKey: [PROXY_KEY, 'today'],
    queryFn: () => proxyApi.getTodayStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useStatsByProvider(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [PROXY_KEY, 'providerStats', startDate, endDate],
    queryFn: () => proxyApi.getStatsByProvider(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useRecentLogs(limit: number = 100) {
  return useQuery({
    queryKey: [PROXY_KEY, 'logs', limit],
    queryFn: () => proxyApi.getRecentLogs(limit),
  });
}

// Mutation hooks
export function useStartProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: proxyApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROXY_KEY, 'status'] });
    },
  });
}

export function useStopProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: proxyApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROXY_KEY, 'status'] });
    },
  });
}

export function useResetCircuitBreaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => proxyApi.resetCircuitBreaker(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROXY_KEY, 'circuitBreaker'] });
    },
  });
}

export function useResetFailover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appType: AppType) => proxyApi.resetFailover(appType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROXY_KEY, 'failover'] });
    },
  });
}
