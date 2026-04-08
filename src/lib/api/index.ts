/**
 * API Layer - Frontend IPC Wrappers
 *
 * Provides type-safe wrappers around electronAPI.invoke
 */

import type {
  ApiResponse,
  Provider,
  CreateProviderInput,
  AppType,
  SwitchProviderResult,
  AppSettings,
  McpServer,
  CreateMcpServerInput,
  Prompt,
  CreatePromptInput,
  Skill,
} from '@/types';

/**
 * Extract data from API response or throw error
 */
function extractData<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error?.message || 'Unknown error');
  }
  if (response.data === undefined) {
    throw new Error('No data returned');
  }
  return response.data;
}

/**
 * Provider API
 */
export const providersApi = {
  getAll: async (appType: AppType): Promise<Provider[]> => {
    const response = (await window.electronAPI.invoke('providers:getAll', appType)) as ApiResponse<
      Provider[]
    >;
    return extractData(response);
  },

  getById: async (id: string, appType: AppType): Promise<Provider | null> => {
    const response = (await window.electronAPI.invoke(
      'providers:getById',
      id,
      appType
    )) as ApiResponse<Provider | null>;
    return extractData(response);
  },

  create: async (input: CreateProviderInput): Promise<Provider> => {
    const response = (await window.electronAPI.invoke(
      'providers:create',
      input
    )) as ApiResponse<Provider>;
    return extractData(response);
  },

  update: async (
    id: string,
    appType: AppType,
    input: Partial<CreateProviderInput>
  ): Promise<Provider> => {
    const response = (await window.electronAPI.invoke(
      'providers:update',
      id,
      appType,
      input
    )) as ApiResponse<Provider>;
    return extractData(response);
  },

  delete: async (id: string, appType: AppType): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'providers:delete',
      id,
      appType
    )) as ApiResponse<void>;
    return extractData(response);
  },

  switch: async (id: string, appType: AppType): Promise<SwitchProviderResult> => {
    const response = (await window.electronAPI.invoke(
      'providers:switch',
      id,
      appType
    )) as ApiResponse<SwitchProviderResult>;
    return extractData(response);
  },

  reorder: async (appType: AppType, providerIds: string[]): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'providers:reorder',
      appType,
      providerIds
    )) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * MCP API
 */
export const mcpApi = {
  getAll: async (): Promise<McpServer[]> => {
    const response = (await window.electronAPI.invoke('mcp:getAll')) as ApiResponse<McpServer[]>;
    return extractData(response);
  },

  getById: async (id: string): Promise<McpServer | null> => {
    const response = (await window.electronAPI.invoke(
      'mcp:getById',
      id
    )) as ApiResponse<McpServer | null>;
    return extractData(response);
  },

  getByApp: async (appType: AppType): Promise<McpServer[]> => {
    const response = (await window.electronAPI.invoke('mcp:getByApp', appType)) as ApiResponse<
      McpServer[]
    >;
    return extractData(response);
  },

  create: async (input: CreateMcpServerInput): Promise<McpServer> => {
    const response = (await window.electronAPI.invoke(
      'mcp:create',
      input
    )) as ApiResponse<McpServer>;
    return extractData(response);
  },

  update: async (id: string, input: Partial<CreateMcpServerInput>): Promise<McpServer> => {
    const response = (await window.electronAPI.invoke(
      'mcp:update',
      id,
      input
    )) as ApiResponse<McpServer>;
    return extractData(response);
  },

  delete: async (id: string): Promise<void> => {
    const response = (await window.electronAPI.invoke('mcp:delete', id)) as ApiResponse<void>;
    return extractData(response);
  },

  toggleApp: async (id: string, appType: AppType, enabled: boolean): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'mcp:toggleApp',
      id,
      appType,
      enabled
    )) as ApiResponse<void>;
    return extractData(response);
  },

  syncAll: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('mcp:syncAll')) as ApiResponse<void>;
    return extractData(response);
  },

  openConfigFolder: async (appType: AppType): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'mcp:openConfigFolder',
      appType
    )) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * Prompt API
 */
export const promptsApi = {
  getAll: async (appType: AppType): Promise<Prompt[]> => {
    const response = (await window.electronAPI.invoke('prompts:getAll', appType)) as ApiResponse<
      Prompt[]
    >;
    return extractData(response);
  },

  getById: async (id: string, appType: AppType): Promise<Prompt | null> => {
    const response = (await window.electronAPI.invoke(
      'prompts:getById',
      id,
      appType
    )) as ApiResponse<Prompt | null>;
    return extractData(response);
  },

  create: async (input: CreatePromptInput): Promise<Prompt> => {
    const response = (await window.electronAPI.invoke(
      'prompts:create',
      input
    )) as ApiResponse<Prompt>;
    return extractData(response);
  },

  update: async (
    id: string,
    appType: AppType,
    input: Partial<CreatePromptInput>
  ): Promise<Prompt> => {
    const response = (await window.electronAPI.invoke(
      'prompts:update',
      id,
      appType,
      input
    )) as ApiResponse<Prompt>;
    return extractData(response);
  },

  delete: async (id: string, appType: AppType): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'prompts:delete',
      id,
      appType
    )) as ApiResponse<void>;
    return extractData(response);
  },

  setActive: async (id: string, appType: AppType): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'prompts:setActive',
      id,
      appType
    )) as ApiResponse<void>;
    return extractData(response);
  },

  getActive: async (appType: AppType): Promise<Prompt | null> => {
    const response = (await window.electronAPI.invoke(
      'prompts:getActive',
      appType
    )) as ApiResponse<Prompt | null>;
    return extractData(response);
  },

  importFromApp: async (appType: AppType, name?: string): Promise<Prompt | null> => {
    const response = (await window.electronAPI.invoke(
      'prompts:importFromApp',
      appType,
      name
    )) as ApiResponse<Prompt | null>;
    return extractData(response);
  },

  syncAll: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('prompts:syncAll')) as ApiResponse<void>;
    return extractData(response);
  },

  openConfigFolder: async (appType: AppType): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'prompts:openConfigFolder',
      appType
    )) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * Proxy API
 */
export const proxyApi = {
  getStatus: async (): Promise<{ isRunning: boolean; port: number }> => {
    const response = (await window.electronAPI.invoke('proxy:getStatus')) as ApiResponse<{
      isRunning: boolean;
      port: number;
    }>;
    return extractData(response);
  },

  start: async (): Promise<{ success: boolean }> => {
    const response = (await window.electronAPI.invoke('proxy:start')) as ApiResponse<{
      success: boolean;
    }>;
    return extractData(response);
  },

  stop: async (): Promise<{ success: boolean }> => {
    const response = (await window.electronAPI.invoke('proxy:stop')) as ApiResponse<{
      success: boolean;
    }>;
    return extractData(response);
  },

  getCircuitBreakerStats: async (): Promise<
    Record<string, { state: string; failures: number; successes: number }>
  > => {
    const response = (await window.electronAPI.invoke(
      'proxy:getCircuitBreakerStats'
    )) as ApiResponse<Record<string, { state: string; failures: number; successes: number }>>;
    return extractData(response);
  },

  resetCircuitBreaker: async (providerId: string): Promise<{ success: boolean }> => {
    const response = (await window.electronAPI.invoke(
      'proxy:resetCircuitBreaker',
      providerId
    )) as ApiResponse<{ success: boolean }>;
    return extractData(response);
  },

  getFailoverStatus: async (): Promise<
    Record<AppType, { appType: AppType; providers: string[]; currentIndex: number } | null>
  > => {
    const response = (await window.electronAPI.invoke('proxy:getFailoverStatus')) as ApiResponse<
      Record<AppType, { appType: AppType; providers: string[]; currentIndex: number } | null>
    >;
    return extractData(response);
  },

  resetFailover: async (appType: AppType): Promise<{ success: boolean }> => {
    const response = (await window.electronAPI.invoke(
      'proxy:resetFailover',
      appType
    )) as ApiResponse<{ success: boolean }>;
    return extractData(response);
  },

  getUsageStats: async (
    startDate: string,
    endDate: string
  ): Promise<Array<{ date: string; requestsCount: number; costUsdTotal: number }>> => {
    const response = (await window.electronAPI.invoke(
      'proxy:getUsageStats',
      startDate,
      endDate
    )) as ApiResponse<Array<{ date: string; requestsCount: number; costUsdTotal: number }>>;
    return extractData(response);
  },

  getTodayStats: async (): Promise<{ requests: number; cost: number }> => {
    const response = (await window.electronAPI.invoke('proxy:getTodayStats')) as ApiResponse<{
      requests: number;
      cost: number;
    }>;
    return extractData(response);
  },

  getStatsByProvider: async (
    startDate: string,
    endDate: string
  ): Promise<Array<{ providerId: string; requests: number; cost: number }>> => {
    const response = (await window.electronAPI.invoke(
      'proxy:getStatsByProvider',
      startDate,
      endDate
    )) as ApiResponse<Array<{ providerId: string; requests: number; cost: number }>>;
    return extractData(response);
  },

  getRecentLogs: async (
    limit?: number
  ): Promise<
    Array<{ timestamp: number; providerId: string; success: boolean; costUsd: number }>
  > => {
    const response = (await window.electronAPI.invoke('proxy:getRecentLogs', limit)) as ApiResponse<
      Array<{ timestamp: number; providerId: string; success: boolean; costUsd: number }>
    >;
    return extractData(response);
  },
};

/**
 * Skill API
 */
export const skillsApi = {
  getAll: async (): Promise<Skill[]> => {
    const response = (await window.electronAPI.invoke('skills:getAll')) as ApiResponse<Skill[]>;
    return extractData(response);
  },

  getInstalled: async (): Promise<Skill[]> => {
    const response = (await window.electronAPI.invoke('skills:getInstalled')) as ApiResponse<
      Skill[]
    >;
    return extractData(response);
  },

  install: async (repoUrl: string, directory?: string): Promise<Skill> => {
    const response = (await window.electronAPI.invoke(
      'skills:install',
      repoUrl,
      directory
    )) as ApiResponse<Skill>;
    return extractData(response);
  },

  uninstall: async (id: string): Promise<void> => {
    const response = (await window.electronAPI.invoke('skills:uninstall', id)) as ApiResponse<void>;
    return extractData(response);
  },

  toggleApp: async (id: string, appType: AppType, enabled: boolean): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'skills:toggleApp',
      id,
      appType,
      enabled
    )) as ApiResponse<void>;
    return extractData(response);
  },

  scanRepo: async (owner: string, name: string): Promise<Skill[]> => {
    const response = (await window.electronAPI.invoke(
      'skills:scanRepo',
      owner,
      name
    )) as ApiResponse<Skill[]>;
    return extractData(response);
  },

  getRepoInfo: async (
    owner: string,
    name: string
  ): Promise<{ owner: string; name: string; url: string; description?: string; stars: number }> => {
    const response = (await window.electronAPI.invoke(
      'skills:getRepoInfo',
      owner,
      name
    )) as ApiResponse<{
      owner: string;
      name: string;
      url: string;
      description?: string;
      stars: number;
    }>;
    return extractData(response);
  },

  openFolder: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('skills:openFolder')) as ApiResponse<void>;
    return extractData(response);
  },

  syncAll: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('skills:syncAll')) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * Settings API
 */
export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    const response = (await window.electronAPI.invoke('settings:get')) as ApiResponse<AppSettings>;
    return extractData(response);
  },

  update: async (settings: Partial<AppSettings>): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'settings:update',
      settings
    )) as ApiResponse<void>;
    return extractData(response);
  },

  reset: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('settings:reset')) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * App API
 */
export const appApi = {
  getVersion: async (): Promise<string> => {
    const response = (await window.electronAPI.invoke('app:getVersion')) as ApiResponse<string>;
    return extractData(response);
  },
};

/**
 * Config Import/Export API
 */
export const configApi = {
  export: async (): Promise<Record<string, unknown>> => {
    const response = (await window.electronAPI.invoke('config:export')) as ApiResponse<
      Record<string, unknown>
    >;
    return extractData(response);
  },

  import: async (data: Record<string, unknown>): Promise<void> => {
    const response = (await window.electronAPI.invoke('config:import', data)) as ApiResponse<void>;
    return extractData(response);
  },
};

// Export all APIs
export const api = {
  providers: providersApi,
  mcp: mcpApi,
  prompts: promptsApi,
  proxy: proxyApi,
  skills: skillsApi,
  settings: settingsApi,
  app: appApi,
  config: configApi,
};
