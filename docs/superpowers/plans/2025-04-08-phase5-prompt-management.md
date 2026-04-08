# Phase 5: Prompt 管理实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现系统提示词管理功能，包括 CRUD 操作、Markdown 编辑器集成和配置回填

**Architecture:** 
- 后端：遵循现有模式创建 `electron/services/prompt/crud.ts` 服务层和 `electron/handlers/prompts.ts` IPC 处理器
- 前端：使用 Monaco Editor 或 CodeMirror 实现分屏 Markdown 编辑器，支持实时预览
- 配置适配器：实现 `electron/services/prompt/config-adapter.ts` 用于跨应用同步

**Tech Stack:** 
- 后端: better-sqlite3, TypeScript
- 前端: React + TanStack Query + shadcn/ui + @uiw/react-md-editor

---

## 文件结构概览

| 文件 | 责任 |
|------|------|
| `electron/services/prompt/crud.ts` | Prompt 数据库 CRUD 操作 |
| `electron/services/prompt/config-adapter.ts` | 跨应用配置文件同步 |
| `electron/handlers/prompts.ts` | IPC 处理器注册 |
| `src/hooks/usePrompts.ts` | TanStack Query hooks |
| `src/pages/Prompts/index.tsx` | Prompt 列表页面 |
| `src/components/prompts/PromptCard.tsx` | Prompt 卡片组件 |
| `src/components/prompts/PromptEditor.tsx` | 分屏 Markdown 编辑器 |
| `src/lib/api/index.ts` | API 层扩展 |

---

## 前置检查

- [x] 数据库表 `prompts` 已创建 (见 `electron/database/schema.ts:69-79`)
- [x] 类型定义已存在 (见 `src/types/index.ts:91-107`)
- [x] IPC 通道已定义 (见 `src/types/index.ts:194-199`)
- [ ] 需要安装 Markdown 编辑器依赖

---

## Task 1: 安装 Markdown 编辑器依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
npm install @uiw/react-md-editor lucide-react
```

- [ ] **Step 2: 验证安装**

Run: `npm list @uiw/react-md-editor`
Expected: 显示版本号

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add react-md-editor for prompt editing"
```

---

## Task 2: 创建 Prompt CRUD 服务

**Files:**
- Create: `electron/services/prompt/crud.ts`
- Reference: `electron/services/mcp/crud.ts` (作为模式参考)

- [ ] **Step 1: 创建 Prompt 服务文件**

Create `electron/services/prompt/crud.ts`:

```typescript
/**
 * Prompt Service - CRUD operations for system prompts
 * 
 * Single Responsibility: Manage prompt lifecycle
 */

import type { Prompt, CreatePromptInput, AppType } from '@/types';
import { dbManager } from '../../database';
import { CCError, ErrorCode } from '../../utils/errors';

export class PromptService {
  /**
   * Get all prompts for an app
   */
  getAll(appType: AppType): Prompt[] {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const stmt = db.prepare(`
      SELECT 
        id,
        app_type as appType,
        name,
        content,
        description,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM prompts
      WHERE app_type = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(appType) as Array<{
      id: string;
      appType: AppType;
      name: string;
      content: string;
      description: string | null;
      isActive: number;
      createdAt: number;
      updatedAt: number;
    }>;

    return rows.map(row => ({
      ...row,
      isActive: Boolean(row.isActive),
    }));
  }

  /**
   * Get a single prompt by ID
   */
  getById(id: string, appType: AppType): Prompt | null {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const stmt = db.prepare(`
      SELECT 
        id,
        app_type as appType,
        name,
        content,
        description,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM prompts
      WHERE id = ? AND app_type = ?
    `);

    const row = stmt.get(id, appType) as {
      id: string;
      appType: AppType;
      name: string;
      content: string;
      description: string | null;
      isActive: number;
      createdAt: number;
      updatedAt: number;
    } | undefined;

    if (!row) return null;

    return {
      ...row,
      isActive: Boolean(row.isActive),
    };
  }

  /**
   * Create a new prompt
   */
  create(input: CreatePromptInput): Prompt {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO prompts (id, app_type, name, content, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.appType,
      input.name,
      input.content,
      input.description ?? null,
      0, // Not active by default
      now,
      now
    );

    return {
      id,
      appType: input.appType,
      name: input.name,
      content: input.content,
      description: input.description,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update a prompt
   */
  update(id: string, appType: AppType, input: Partial<CreatePromptInput>): Prompt {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const existing = this.getById(id, appType);
    if (!existing) {
      throw new CCError(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.content !== undefined) {
      updates.push('content = ?');
      values.push(input.content);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    values.push(appType);

    const stmt = db.prepare(`
      UPDATE prompts
      SET ${updates.join(', ')}
      WHERE id = ? AND app_type = ?
    `);

    stmt.run(...values);

    return this.getById(id, appType)!;
  }

  /**
   * Delete a prompt
   */
  delete(id: string, appType: AppType): void {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const stmt = db.prepare('DELETE FROM prompts WHERE id = ? AND app_type = ?');
    const result = stmt.run(id, appType);

    if (result.changes === 0) {
      throw new CCError(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
    }
  }

  /**
   * Set a prompt as active (and deactivate others for same app)
   */
  setActive(id: string, appType: AppType): void {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const existing = this.getById(id, appType);
    if (!existing) {
      throw new CCError(ErrorCode.NOT_FOUND, `Prompt ${id} not found`);
    }

    // Transaction: deactivate all, then activate one
    const deactivateAll = db.prepare(`
      UPDATE prompts SET is_active = 0, updated_at = ? WHERE app_type = ?
    `);
    const activateOne = db.prepare(`
      UPDATE prompts SET is_active = 1, updated_at = ? WHERE id = ? AND app_type = ?
    `);

    const now = Date.now();
    
    const transaction = db.transaction(() => {
      deactivateAll.run(now, appType);
      activateOne.run(now, id, appType);
    });

    transaction();
  }

  /**
   * Get active prompt for an app
   */
  getActive(appType: AppType): Prompt | null {
    const db = dbManager.getDatabase();
    if (!db) throw new CCError(ErrorCode.DATABASE_ERROR, 'Database not initialized');

    const stmt = db.prepare(`
      SELECT 
        id,
        app_type as appType,
        name,
        content,
        description,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM prompts
      WHERE app_type = ? AND is_active = 1
      LIMIT 1
    `);

    const row = stmt.get(appType) as {
      id: string;
      appType: AppType;
      name: string;
      content: string;
      description: string | null;
      isActive: number;
      createdAt: number;
      updatedAt: number;
    } | undefined;

    if (!row) return null;

    return {
      ...row,
      isActive: Boolean(row.isActive),
    };
  }
}

// Export singleton instance
export const promptService = new PromptService();
```

- [ ] **Step 2: 验证文件创建**

Run: `ls -la electron/services/prompt/`
Expected: `crud.ts` exists

- [ ] **Step 3: Commit**

```bash
git add electron/services/prompt/crud.ts
git commit -m "feat(prompts): add Prompt CRUD service"
```

---

## Task 3: 创建 Prompt 配置适配器

**Files:**
- Create: `electron/services/prompt/config-adapter.ts`
- Reference: `electron/services/mcp/config-adapter.ts`

- [ ] **Step 1: 创建配置适配器**

Create `electron/services/prompt/config-adapter.ts`:

```typescript
/**
 * Prompt Config Adapter
 * 
 * Manages prompt configuration files for different AI applications
 * Similar to MCP adapter but for prompts
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import type { AppType, Prompt } from '@/types';
import { CCError, ErrorCode } from '../../utils/errors';
import { promptService } from './crud';

// Config file paths for each app
const CONFIG_PATHS: Record<AppType, string> = {
  claude: path.join(
    process.env.HOME || '',
    'Library/Application Support/Claude'
  ),
  codex: path.join(
    process.env.HOME || '',
    '.codex'
  ),
  gemini: path.join(
    process.env.HOME || '',
    '.gemini'
  ),
  opencode: path.join(
    process.env.HOME || '',
    '.opencode'
  ),
  openclaw: path.join(
    process.env.HOME || '',
    '.openclaw'
  ),
};

// Config file names
const CONFIG_FILES: Record<AppType, string> = {
  claude: 'settings.json',
  codex: 'settings.json',
  gemini: 'config.json',
  opencode: 'settings.json',
  openclaw: 'settings.json',
};

export interface AppPromptConfig {
  systemPrompt?: string;
  customInstructions?: string;
}

export class PromptConfigAdapter {
  /**
   * Get the config file path for an app
   */
  private getConfigPath(appType: AppType): string {
    const basePath = CONFIG_PATHS[appType];
    const fileName = CONFIG_FILES[appType];
    return path.join(basePath, fileName);
  }

  /**
   * Read app config file
   */
  private readConfig(appType: AppType): Record<string, unknown> {
    const configPath = this.getConfigPath(appType);
    
    try {
      if (!fs.existsSync(configPath)) {
        return {};
      }
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to read config for ${appType}:`, error);
      return {};
    }
  }

  /**
   * Write app config file
   */
  private writeConfig(appType: AppType, config: Record<string, unknown>): void {
    const configPath = this.getConfigPath(appType);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new CCError(
        ErrorCode.FILE_SYSTEM_ERROR,
        `Failed to write config for ${appType}: ${error}`
      );
    }
  }

  /**
   * Extract prompt content from app config
   */
  private extractPromptContent(appType: AppType, config: Record<string, unknown>): string | null {
    switch (appType) {
      case 'claude':
        // Claude stores in settings.json -> systemPrompt
        return (config.systemPrompt as string) || null;
      
      case 'codex':
        // Codex may store in different formats
        return (config.systemPrompt as string) || 
               (config.customInstructions as string) || 
               null;
      
      case 'gemini':
        return (config.systemPrompt as string) || null;
      
      case 'opencode':
        return (config.systemPrompt as string) || null;
      
      case 'openclaw':
        return (config.systemPrompt as string) || null;
      
      default:
        return null;
    }
  }

  /**
   * Inject prompt content into app config
   */
  private injectPromptContent(
    appType: AppType, 
    config: Record<string, unknown>, 
    content: string | null
  ): Record<string, unknown> {
    const newConfig = { ...config };
    
    switch (appType) {
      case 'claude':
        if (content) {
          newConfig.systemPrompt = content;
        } else {
          delete newConfig.systemPrompt;
        }
        break;
      
      case 'codex':
        if (content) {
          newConfig.systemPrompt = content;
        } else {
          delete newConfig.systemPrompt;
        }
        break;
      
      case 'gemini':
      case 'opencode':
      case 'openclaw':
        if (content) {
          newConfig.systemPrompt = content;
        } else {
          delete newConfig.systemPrompt;
        }
        break;
    }
    
    return newConfig;
  }

  /**
   * Sync active prompt to app config
   */
  syncToApp(appType: AppType): void {
    const activePrompt = promptService.getActive(appType);
    const config = this.readConfig(appType);
    
    const newConfig = this.injectPromptContent(
      appType,
      config,
      activePrompt?.content || null
    );
    
    this.writeConfig(appType, newConfig);
  }

  /**
   * Import prompt from app config
   */
  importFromApp(appType: AppType, name: string = 'Imported'): Prompt | null {
    const config = this.readConfig(appType);
    const content = this.extractPromptContent(appType, config);
    
    if (!content) {
      return null;
    }

    // Check if already exists
    const existing = promptService.getAll(appType).find(
      p => p.content === content
    );
    
    if (existing) {
      return existing;
    }

    // Create new prompt
    return promptService.create({
      appType,
      name,
      content,
      description: `Imported from ${appType} config`,
    });
  }

  /**
   * Sync all apps
   */
  syncAll(): void {
    const apps: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];
    
    for (const appType of apps) {
      try {
        this.syncToApp(appType);
      } catch (error) {
        console.warn(`Failed to sync ${appType}:`, error);
      }
    }
  }

  /**
   * Open config folder in file manager
   */
  openConfigFolder(appType: AppType): void {
    const configPath = CONFIG_PATHS[appType];
    
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }

    const { shell } = require('electron');
    shell.openPath(configPath);
  }
}

// Export singleton instance
export const promptConfigAdapter = new PromptConfigAdapter();
```

- [ ] **Step 2: Commit**

```bash
git add electron/services/prompt/config-adapter.ts
git commit -m "feat(prompts): add config adapter for cross-app sync"
```

---

## Task 4: 创建 IPC Handlers

**Files:**
- Create: `electron/handlers/prompts.ts`
- Modify: `electron/main.ts` (注册 handlers)

- [ ] **Step 1: 创建 IPC 处理器**

Create `electron/handlers/prompts.ts`:

```typescript
/**
 * Prompt IPC Handlers
 * 
 * Registers all prompt-related IPC channels
 */

import { ipcRegistry } from '../ipc/registry';
import { promptService } from '../services/prompt/crud';
import { promptConfigAdapter } from '../services/prompt/config-adapter';
import type { AppType, CreatePromptInput } from '@/types';
import { CCError } from '../utils/errors';

export function registerPromptHandlers() {
  // Get all prompts for an app
  ipcRegistry.register('prompts:getAll', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];
    return promptService.getAll(appType);
  });

  // Get single prompt
  ipcRegistry.register('prompts:getById', async (_event, ...args: unknown[]) => {
    const [id, appType] = args as [string, AppType];
    return promptService.getById(id, appType);
  });

  // Create prompt
  ipcRegistry.register('prompts:create', async (_event, ...args: unknown[]) => {
    const [input] = args as [CreatePromptInput];
    const prompt = promptService.create(input);
    // Sync to app config
    promptConfigAdapter.syncToApp(input.appType);
    return prompt;
  });

  // Update prompt
  ipcRegistry.register('prompts:update', async (_event, ...args: unknown[]) => {
    const [id, appType, input] = args as [string, AppType, Partial<CreatePromptInput>];
    const prompt = promptService.update(id, appType, input);
    // Sync to app config
    promptConfigAdapter.syncToApp(appType);
    return prompt;
  });

  // Delete prompt
  ipcRegistry.register('prompts:delete', async (_event, ...args: unknown[]) => {
    const [id, appType] = args as [string, AppType];
    promptService.delete(id, appType);
    // Sync to app config
    promptConfigAdapter.syncToApp(appType);
    return { success: true };
  });

  // Set active prompt
  ipcRegistry.register('prompts:setActive', async (_event, ...args: unknown[]) => {
    const [id, appType] = args as [string, AppType];
    promptService.setActive(id, appType);
    // Sync to app config
    promptConfigAdapter.syncToApp(appType);
    return { success: true };
  });

  // Get active prompt
  ipcRegistry.register('prompts:getActive', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];
    return promptService.getActive(appType);
  });

  // Import from app config
  ipcRegistry.register('prompts:importFromApp', async (_event, ...args: unknown[]) => {
    const [appType, name] = args as [AppType, string?];
    return promptConfigAdapter.importFromApp(appType, name);
  });

  // Sync all apps
  ipcRegistry.register('prompts:syncAll', async () => {
    promptConfigAdapter.syncAll();
    return { success: true };
  });

  // Open config folder
  ipcRegistry.register('prompts:openConfigFolder', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];
    promptConfigAdapter.openConfigFolder(appType);
    return { success: true };
  });

  console.log('Prompt IPC handlers registered');
}
```

- [ ] **Step 2: 注册 IPC Handlers 到 main.ts**

Modify `electron/main.ts`:

```typescript
// Add import at the top
import { registerPromptHandlers } from './handlers/prompts';

// In initializeApp function, add after registerSkillsHandlers();
registerPromptHandlers();
```

- [ ] **Step 3: Commit**

```bash
git add electron/handlers/prompts.ts electron/main.ts
git commit -m "feat(prompts): add IPC handlers and register in main process"
```

---

## Task 5: 前端 API 层扩展

**Files:**
- Modify: `src/lib/api/index.ts`

- [ ] **Step 1: 添加 Prompts API**

Modify `src/lib/api/index.ts`, add after skillsApi:

```typescript
/**
 * Prompts API
 */
export const promptsApi = {
  getAll: async (appType: AppType): Promise<Prompt[]> => {
    const response = await window.electronAPI.invoke('prompts:getAll', appType) as ApiResponse<Prompt[]>;
    return extractData(response);
  },

  getById: async (id: string, appType: AppType): Promise<Prompt | null> => {
    const response = await window.electronAPI.invoke('prompts:getById', id, appType) as ApiResponse<Prompt | null>;
    return extractData(response);
  },

  create: async (input: CreatePromptInput): Promise<Prompt> => {
    const response = await window.electronAPI.invoke('prompts:create', input) as ApiResponse<Prompt>;
    return extractData(response);
  },

  update: async (id: string, appType: AppType, input: Partial<CreatePromptInput>): Promise<Prompt> => {
    const response = await window.electronAPI.invoke('prompts:update', id, appType, input) as ApiResponse<Prompt>;
    return extractData(response);
  },

  delete: async (id: string, appType: AppType): Promise<void> => {
    const response = await window.electronAPI.invoke('prompts:delete', id, appType) as ApiResponse<void>;
    return extractData(response);
  },

  setActive: async (id: string, appType: AppType): Promise<void> => {
    const response = await window.electronAPI.invoke('prompts:setActive', id, appType) as ApiResponse<void>;
    return extractData(response);
  },

  getActive: async (appType: AppType): Promise<Prompt | null> => {
    const response = await window.electronAPI.invoke('prompts:getActive', appType) as ApiResponse<Prompt | null>;
    return extractData(response);
  },

  importFromApp: async (appType: AppType, name?: string): Promise<Prompt | null> => {
    const response = await window.electronAPI.invoke('prompts:importFromApp', appType, name) as ApiResponse<Prompt | null>;
    return extractData(response);
  },

  syncAll: async (): Promise<void> => {
    const response = await window.electronAPI.invoke('prompts:syncAll') as ApiResponse<void>;
    return extractData(response);
  },

  openConfigFolder: async (appType: AppType): Promise<void> => {
    const response = await window.electronAPI.invoke('prompts:openConfigFolder', appType) as ApiResponse<void>;
    return extractData(response);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/index.ts
git commit -m "feat(prompts): add frontend API layer"
```

---

## Task 6: 创建 TanStack Query Hooks

**Files:**
- Create: `src/hooks/usePrompts.ts`

- [ ] **Step 1: 创建 hooks 文件**

Create `src/hooks/usePrompts.ts`:

```typescript
/**
 * Prompts Hooks
 * 
 * TanStack Query hooks for prompt management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi } from '@/lib/api';
import type { AppType, CreatePromptInput } from '@/types';

const QUERY_KEY = 'prompts';

/**
 * Get all prompts for an app
 */
export function usePrompts(appType: AppType) {
  return useQuery({
    queryKey: [QUERY_KEY, appType],
    queryFn: () => promptsApi.getAll(appType),
  });
}

/**
 * Get active prompt
 */
export function useActivePrompt(appType: AppType) {
  return useQuery({
    queryKey: [QUERY_KEY, 'active', appType],
    queryFn: () => promptsApi.getActive(appType),
  });
}

/**
 * Create prompt mutation
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: promptsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.appType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'active', data.appType] });
    },
  });
}

/**
 * Update prompt mutation
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, appType, input }: { 
      id: string; 
      appType: AppType; 
      input: Partial<CreatePromptInput>;
    }) => promptsApi.update(id, appType, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.appType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'active', variables.appType] });
    },
  });
}

/**
 * Delete prompt mutation
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, appType }: { id: string; appType: AppType }) => 
      promptsApi.delete(id, appType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.appType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'active', variables.appType] });
    },
  });
}

/**
 * Set active prompt mutation
 */
export function useSetActivePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, appType }: { id: string; appType: AppType }) => 
      promptsApi.setActive(id, appType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.appType] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'active', variables.appType] });
    },
  });
}

/**
 * Import from app mutation
 */
export function useImportPromptFromApp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ appType, name }: { appType: AppType; name?: string }) => 
      promptsApi.importFromApp(appType, name),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.appType] });
      }
    },
  });
}

/**
 * Sync all prompts mutation
 */
export function useSyncAllPrompts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: promptsApi.syncAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePrompts.ts
git commit -m "feat(prompts): add TanStack Query hooks"
```

---

## Task 7: 创建 PromptCard 组件

**Files:**
- Create: `src/components/prompts/PromptCard.tsx`

- [ ] **Step 1: 创建 PromptCard 组件**

Create `src/components/prompts/PromptCard.tsx`:

```typescript
/**
 * PromptCard Component
 * 
 * Displays a single prompt with actions
 */

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Trash2, 
  Check, 
  FileText,
  MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Prompt } from '@/types';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onSetActive: (prompt: Prompt) => void;
  isActive: boolean;
}

export function PromptCard({ 
  prompt, 
  onEdit, 
  onDelete, 
  onSetActive,
  isActive 
}: PromptCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Truncate content for preview
  const previewContent = prompt.content.length > 150 
    ? prompt.content.slice(0, 150) + '...'
    : prompt.content;

  return (
    <Card 
      className={`relative transition-all duration-200 ${
        isActive ? 'border-primary ring-1 ring-primary' : ''
      } ${isHovered ? 'shadow-md' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-primary text-primary-foreground">
            <Check className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">{prompt.name}</CardTitle>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(prompt)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onSetActive(prompt)}
                disabled={isActive}
              >
                <Check className="w-4 h-4 mr-2" />
                Set as Active
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(prompt)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {prompt.description && (
          <CardDescription className="mt-2">
            {prompt.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground font-mono whitespace-pre-wrap line-clamp-4">
          {previewContent}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 text-xs text-muted-foreground">
        Updated {new Date(prompt.updatedAt).toLocaleDateString()}
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prompts/PromptCard.tsx
git commit -m "feat(prompts): add PromptCard component"
```

---

## Task 8: 创建 PromptEditor 组件

**Files:**
- Create: `src/components/prompts/PromptEditor.tsx`

- [ ] **Step 1: 创建 Markdown 编辑器组件**

Create `src/components/prompts/PromptEditor.tsx`:

```typescript
/**
 * PromptEditor Component
 * 
 * Split-pane Markdown editor with live preview
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Edit3, Save, X, FileText } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { Prompt, CreatePromptInput, AppType } from '@/types';

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePromptInput) => void;
  prompt?: Prompt | null;
  appType: AppType;
}

export function PromptEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  prompt,
  appType 
}: PromptEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!prompt;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (prompt) {
        setName(prompt.name);
        setDescription(prompt.description || '');
        setContent(prompt.content);
      } else {
        setName('');
        setDescription('');
        setContent('');
      }
      setErrors({});
    }
  }, [isOpen, prompt]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!content.trim()) {
      newErrors.content = 'Content is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    onSave({
      appType,
      name: name.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isEditing ? 'Edit Prompt' : 'Create Prompt'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edit your system prompt below'
              : 'Create a new system prompt for your AI assistant'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 min-h-0">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Code Review Assistant"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt does"
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2 flex-1 min-h-0">
            <Label>Content *</Label>
            <Tabs defaultValue="edit" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-fit">
                <TabsTrigger value="edit" className="flex items-center gap-1">
                  <Edit3 className="w-4 h-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="split" className="flex items-center gap-1">
                  <Edit3 className="w-4 h-4" />
                  Split
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="flex-1 min-h-0 mt-2">
                <div className="h-[400px] border rounded-md overflow-hidden">
                  <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    height="100%"
                    visibleDragBar={false}
                    hideToolbar={false}
                    textareaProps={{
                      placeholder: 'Enter your system prompt here...',
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <MDEditor.Markdown 
                    source={content || '*No content*'} 
                    style={{ background: 'transparent' }}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="split" className="flex-1 min-h-0 mt-2">
                <div className="grid grid-cols-2 gap-4 h-[400px]">
                  <div className="border rounded-md overflow-hidden">
                    <MDEditor
                      value={content}
                      onChange={(val) => setContent(val || '')}
                      height="100%"
                      visibleDragBar={false}
                      hideToolbar={false}
                      textareaProps={{
                        placeholder: 'Enter your system prompt here...',
                      }}
                    />
                  </div>
                  <ScrollArea className="border rounded-md p-4 bg-muted/30">
                    <MDEditor.Markdown 
                      source={content || '*No content*'} 
                      style={{ background: 'transparent' }}
                    />
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Create Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/prompts/PromptEditor.tsx
git commit -m "feat(prompts): add Markdown editor with live preview"
```

---

## Task 9: 创建 Prompts 列表页面

**Files:**
- Create: `src/pages/Prompts/index.tsx`

- [ ] **Step 1: 创建完整页面**

Create `src/pages/Prompts/index.tsx`:

```typescript
/**
 * Prompts Page
 * 
 * Main page for managing system prompts
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Download, 
  RefreshCw, 
  FolderOpen,
  AlertCircle 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PromptCard } from '@/components/prompts/PromptCard';
import { PromptEditor } from '@/components/prompts/PromptEditor';
import { 
  usePrompts, 
  useActivePrompt,
  useCreatePrompt,
  useUpdatePrompt,
  useDeletePrompt,
  useSetActivePrompt,
  useImportPromptFromApp,
} from '@/hooks/usePrompts';
import type { AppType, Prompt, CreatePromptInput } from '@/types';
import { APP_TYPES } from '@/types';

const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

export default function PromptsPage() {
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // Queries
  const { data: prompts, isLoading, error } = usePrompts(selectedApp);
  const { data: activePrompt } = useActivePrompt(selectedApp);

  // Mutations
  const createPrompt = useCreatePrompt();
  const updatePrompt = useUpdatePrompt();
  const deletePrompt = useDeletePrompt();
  const setActivePrompt = useSetActivePrompt();
  const importFromApp = useImportPromptFromApp();

  const handleCreate = () => {
    setEditingPrompt(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsEditorOpen(true);
  };

  const handleDelete = (prompt: Prompt) => {
    if (confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
      deletePrompt.mutate({ id: prompt.id, appType: prompt.appType });
    }
  };

  const handleSetActive = (prompt: Prompt) => {
    setActivePrompt.mutate({ id: prompt.id, appType: prompt.appType });
  };

  const handleSave = (data: CreatePromptInput) => {
    if (editingPrompt) {
      updatePrompt.mutate({
        id: editingPrompt.id,
        appType: editingPrompt.appType,
        input: data,
      });
    } else {
      createPrompt.mutate(data);
    }
  };

  const handleImport = () => {
    importFromApp.mutate({ 
      appType: selectedApp,
      name: `Imported from ${APP_LABELS[selectedApp]}`
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Prompts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system prompts for your AI assistants
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select 
            value={selectedApp} 
            onValueChange={(v) => setSelectedApp(v as AppType)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select app" />
            </SelectTrigger>
            <SelectContent>
              {APP_TYPES.map((app) => (
                <SelectItem key={app} value={app}>
                  {APP_LABELS[app]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleImport}>
            <Download className="w-4 h-4 mr-2" />
            Import
          </Button>

          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Prompt
          </Button>
        </div>
      </div>

      {/* Active Prompt Info */}
      {activePrompt && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-primary">
              Currently Active Prompt
            </CardTitle>
            <CardDescription className="text-base font-semibold">
              {activePrompt.name}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load prompts: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!prompts || prompts.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No prompts yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-2">
              Create your first system prompt or import from {APP_LABELS[selectedApp]}
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleImport}>
                <Download className="w-4 h-4 mr-2" />
                Import from App
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Prompt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts Grid */}
      {prompts && prompts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isActive={prompt.id === activePrompt?.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetActive={handleSetActive}
            />
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <PromptEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSave}
        prompt={editingPrompt}
        appType={selectedApp}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Prompts/index.tsx
git commit -m "feat(prompts): add complete prompts management page"
```

---

## Task 10: 注册路由

**Files:**
- Modify: `src/lib/router.tsx`

- [ ] **Step 1: 添加 Prompts 路由**

Modify `src/lib/router.tsx`:

```typescript
// Add import
import PromptsPage from '@/pages/Prompts';

// In routes array, add:
{
  path: '/prompts',
  element: <PromptsPage />,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/router.tsx
git commit -m "feat(prompts): register prompts route"
```

---

## Task 11: 更新 Sidebar 导航

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: 添加 Prompts 导航项**

Modify `src/components/Sidebar.tsx`, add to navigation items:

```typescript
import { FileText } from 'lucide-react';

// In navigation array, add:
{
  name: 'Prompts',
  path: '/prompts',
  icon: FileText,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(prompts): add prompts to sidebar navigation"
```

---

## Task 12: 添加必要的 shadcn/ui 组件

**Files:**
- Check: `src/components/ui/` 目录

- [ ] **Step 1: 检查并安装缺失的组件**

```bash
# Check if these components exist
ls src/components/ui/ | grep -E "(textarea|scroll-area|tabs|alert)"

# If any missing, install them:
npx shadcn add textarea scroll-area tabs alert
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/
git commit -m "chore: add shadcn/ui components for prompts page"
```

---

## Task 13: 测试和验证

- [ ] **Step 1: 验证 TypeScript 编译**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 2: 验证应用启动**

```bash
npm run dev
```

Expected: 
- App starts without errors
- Prompts menu item visible in sidebar
- Can navigate to /prompts
- Create/Edit/Delete/SetActive operations work

- [ ] **Step 3: 运行 lint**

```bash
npm run lint
```

Expected: No errors or warnings

- [ ] **Step 4: Commit final changes**

```bash
git add -A
git commit -m "feat(phase5): complete prompt management implementation"
```

---

## Spec Coverage Check

| Requirement | Task | Status |
|-------------|------|--------|
| Prompt 数据结构 | ✅ Pre-defined in types/index.ts | N/A |
| Prompt CRUD 服务 | Task 2 | electron/services/prompt/crud.ts |
| Markdown 编辑器集成 | Task 8 | @uiw/react-md-editor |
| 实时预览 | Task 8 | Split-pane editor with tabs |
| Prompt 列表 UI | Task 9 | Grid layout with cards |
| 编辑表单 | Task 8 | Dialog with full editor |
| 配置回填 | Task 3 | Config adapter sync |

---

## Post-Implementation Notes

1. **编辑器选择**: 使用 `@uiw/react-md-editor` 提供良好的 Markdown 编辑体验
2. **预览模式**: 支持三种视图：编辑、预览、分屏
3. **跨应用同步**: 自动同步 active prompt 到应用配置文件
4. **激活状态**: 每个应用只能有一个 active prompt，切换时自动更新

---

**Plan complete. Execute using superpowers:subagent-driven-development or superpowers:executing-plans.**
