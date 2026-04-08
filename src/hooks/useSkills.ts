/**
 * Skills Hooks
 *
 * TanStack Query hooks for skills management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsApi } from '@/lib/api';
import type { AppType, Skill } from '@/types';

// Query keys
export const skillsKeys = {
  all: ['skills'] as const,
  lists: () => [...skillsKeys.all, 'list'] as const,
  list: () => [...skillsKeys.lists()] as const,
  details: () => [...skillsKeys.all, 'detail'] as const,
  detail: (id: string) => [...skillsKeys.details(), id] as const,
  repos: () => [...skillsKeys.all, 'repos'] as const,
  repo: (owner: string, name: string) => [...skillsKeys.repos(), owner, name] as const,
};

/**
 * Hook to fetch all installed skills
 */
export function useSkills() {
  return useQuery({
    queryKey: skillsKeys.list(),
    queryFn: () => skillsApi.getAll(),
  });
}

/**
 * Hook to fetch installed skills
 */
export function useInstalledSkills() {
  return useQuery({
    queryKey: skillsKeys.list(),
    queryFn: () => skillsApi.getInstalled(),
  });
}

/**
 * Hook to install a skill
 */
export function useInstallSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoUrl, directory }: { repoUrl: string; directory?: string }) =>
      skillsApi.install(repoUrl, directory),
    onSuccess: () => {
      // Only refresh list on successful installation
      queryClient.invalidateQueries({
        queryKey: skillsKeys.list(),
      });
    },
    onError: () => {
      // Ensure cache is clean on error - remove any potentially stale data
      queryClient.invalidateQueries({
        queryKey: skillsKeys.list(),
      });
    },
  });
}

/**
 * Hook to install a local skill
 */
export function useInstallLocalSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ localPath, skillName }: { localPath: string; skillName: string }) =>
      skillsApi.installLocal(localPath, skillName),
    onSuccess: async () => {
      // Immediately refetch to update the UI
      await queryClient.refetchQueries({
        queryKey: skillsKeys.list(),
      });
    },
  });
}

/**
 * Hook to uninstall a skill with optimistic update
 */
export function useUninstallSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => skillsApi.uninstall(id),
    // Optimistic update - immediately remove from UI
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: skillsKeys.list() });

      // Snapshot the previous value
      const previousSkills = queryClient.getQueryData<Skill[]>(skillsKeys.list());

      // Optimistically update to the new value
      queryClient.setQueryData<Skill[]>(skillsKeys.list(), (old) => {
        if (!old) return [];
        return old.filter((skill) => skill.id !== id);
      });

      // Return a context object with the snapshotted value
      return { previousSkills };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _id, context) => {
      if (context?.previousSkills) {
        queryClient.setQueryData(skillsKeys.list(), context.previousSkills);
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: skillsKeys.list(),
      });
    },
  });
}

/**
 * Hook to toggle skill for an app with optimistic update
 */
export function useToggleSkillApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, appType, enabled }: { id: string; appType: AppType; enabled: boolean }) =>
      skillsApi.toggleApp(id, appType, enabled),
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
      await queryClient.cancelQueries({ queryKey: skillsKeys.list() });

      // Snapshot the previous value
      const previousSkills = queryClient.getQueryData<Skill[]>(skillsKeys.list());

      // Optimistically update to the new value
      queryClient.setQueryData<Skill[]>(skillsKeys.list(), (old) => {
        if (!old) return [];
        return old.map((skill) => {
          if (skill.id === id) {
            return {
              ...skill,
              enabledApps: {
                ...skill.enabledApps,
                [appType]: enabled,
              },
            };
          }
          return skill;
        });
      });

      // Return a context object with the snapshotted value
      return { previousSkills };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousSkills) {
        queryClient.setQueryData(skillsKeys.list(), context.previousSkills);
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: skillsKeys.list(),
      });
    },
  });
}

/**
 * Hook to scan a GitHub repository for skills
 */
export function useScanRepo(owner: string, name: string, enabled = true) {
  return useQuery({
    queryKey: skillsKeys.repo(owner, name),
    queryFn: () => skillsApi.scanRepo(owner, name),
    enabled: enabled && !!owner && !!name,
  });
}

/**
 * Hook to get repository info
 */
export function useRepoInfo(owner: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [...skillsKeys.repos(), 'info', owner, name],
    queryFn: () => skillsApi.getRepoInfo(owner, name),
    enabled: enabled && !!owner && !!name,
  });
}

/**
 * Hook to open skills folder
 */
export function useOpenSkillsFolder() {
  return useMutation({
    mutationFn: () => skillsApi.openFolder(),
  });
}

/**
 * Hook to sync all skills
 */
export function useSyncSkills() {
  return useMutation({
    mutationFn: () => skillsApi.syncAll(),
  });
}
