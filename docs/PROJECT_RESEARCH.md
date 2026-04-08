# CC Switch 项目研究文档

**版本**: 3.12.3  
**分析日期**: 2026-04-08  
**用途**: 项目重写基准文档

---

## 目录

1. [项目概述](#1-项目概述)
2. [功能点清单](#2-功能点清单)
3. [技术架构总览](#3-技术架构总览)
4. [前端架构详解](#4-前端架构详解)
5. [后端架构详解](#5-后端架构详解)
6. [数据库设计](#6-数据库设计)
7. [核心功能实现](#7-核心功能实现)
8. [配置和工具链](#8-配置和工具链)
9. [项目重写注意事项](#9-项目重写注意事项)

---

## 1. 项目概述

### 1.1 项目简介

CC Switch 是一个**All-in-One桌面应用程序**，用于统一管理以下 AI CLI 工具的配置：

- **Claude Code** - Anthropic 的 Claude CLI 工具
- **Codex** - OpenAI 的 Codex CLI 工具
- **Gemini CLI** - Google 的 Gemini CLI 工具
- **OpenCode** - 第三方开源 AI CLI 工具
- **OpenClaw** - 第三方 AI CLI 工具

### 1.2 核心价值主张

1. **统一配置管理** - 在一个界面管理多个 AI 工具的配置
2. **快速切换** - 一键切换不同的 AI 供应商和模型
3. **MCP 服务器管理** - 统一管理 MCP (Model Context Protocol) 服务器
4. **Skills 管理** - 发现、安装和管理 Skills
5. **本地代理服务** - 提供 HTTP 代理，支持故障转移和熔断
6. **系统托盘集成** - 不占用 Dock，通过托盘快速操作

### 1.3 技术栈

| 层级       | 技术            | 版本      | 说明           |
| ---------- | --------------- | --------- | -------------- |
| 前端框架   | React           | 18.2.0    | UI 组件库      |
| 前端语言   | TypeScript      | 5.3.0     | 类型安全       |
| 构建工具   | Vite            | 7.3.0     | 开发与构建     |
| 样式       | TailwindCSS     | 3.4.17    | 原子化 CSS     |
| UI 组件    | shadcn/ui       | -         | 基于 Radix UI  |
| 状态管理   | TanStack Query  | 5.90.3    | 服务端状态     |
| 表单       | react-hook-form | 7.65.0    | 表单处理       |
| 验证       | Zod             | 4.1.12    | 运行时类型验证 |
| 桌面框架   | Tauri           | 2.8.2     | Rust 原生后端  |
| 数据库     | SQLite          | -         | rusqlite 0.31  |
| 代理服务器 | Axum + Hyper    | 0.7 / 1.0 | HTTP 代理      |
| 测试       | Vitest + MSW    | 2.0.5     | 单元测试       |

---

## 2. 功能点清单

### 2.1 Provider 管理功能

#### 2.1.1 供应商 CRUD

- **添加供应商**: 从预设列表选择或自定义创建
- **编辑供应商**: 修改配置、名称、图标等
- **删除供应商**: 软删除，保留历史数据
- **排序**: 拖拽调整供应商顺序
- **搜索**: 按名称搜索供应商

#### 2.1.2 供应商分类

- **Official** - 官方供应商 (Anthropic Claude)
- **CN Official** - 国内官方 (DeepSeek、智谱、Kimi)
- **Aggregator** - 聚合平台 (OpenRouter、SiliconFlow)
- **Third Party** - 第三方供应商 (PackyCode、Cubence)
- **Cloud Provider** - 云服务商 (AWS Bedrock)
- **Custom** - 用户自定义
- **OMO** - Oh My OpenCode 集成

#### 2.1.3 供应商切换

- **快速切换**: 一键切换当前使用的供应商
- **累加模式**: OpenCode/OpenClaw 支持多供应商同时启用
- **故障转移**: 自动切换到备用供应商
- **配置回填**: 切换时自动回填之前的配置
- **配置验证**: 切换前验证配置有效性

#### 2.1.4 通用供应商 (Universal Provider)

- **跨应用共享**: 一个供应商配置用于多个应用
- **自动转换**: 根据目标应用自动转换配置格式
- **统一端点**: 支持 NewAPI 等网关

#### 2.1.5 Provider 元数据

- **自定义端点**: 多个 API 端点选择
- **成本倍数**: 自定义计费倍率
- **用量脚本**: 自定义用量查询脚本
- **测试配置**: 连接测试配置
- **代理配置**: 单独代理设置
- **API 格式**: 支持 Anthropic/OpenAI 格式

### 2.2 MCP 服务器管理

#### 2.2.1 MCP CRUD

- **添加 MCP**: 手动输入或从预设选择
- **编辑 MCP**: 修改命令、参数、环境变量
- **删除 MCP**: 移除服务器配置
- **启用/禁用**: 控制每个应用的启用状态

#### 2.2.2 跨应用同步

- **统一存储**: 所有 MCP 存储在数据库
- **独立启用**: 每个应用独立控制启用状态
- **自动同步**: 变更后自动同步到各应用配置

#### 2.2.3 Transport 类型支持

- **stdio**: 标准输入输出 (命令行工具)
- **http**: HTTP 端点
- **sse**: Server-Sent Events

#### 2.2.4 MCP 预设

- **内置预设**: fetch、time、memory、sequential-thinking 等
- **社区预设**: 可从预设列表快速添加

### 2.3 Skills 管理

#### 2.3.1 Skills 发现

- **仓库扫描**: 自动扫描配置的 GitHub 仓库
- **SKILL.md 解析**: 解析 YAML front matter 获取元数据
- **搜索过滤**: 按名称、标签搜索

#### 2.3.2 Skills 安装

- **GitHub 下载**: 从 GitHub 仓库下载
- **SSOT 管理**: 单一数据源存储在 `~/.cc-switch/skills/`
- **多版本管理**: 支持同一技能的不同版本

#### 2.3.3 Skills 启用

- **跨应用启用**: 可为不同应用分别启用
- **自动同步**: 安装后自动同步到应用目录
- **符号链接**: 使用符号链接减少磁盘占用

#### 2.3.4 默认仓库

- `anthropics/skills`
- `ComposioHQ/awesome-claude-skills`
- `cexll/myclaude`
- `JimLiu/baoyu-skills`

### 2.4 Prompt 管理

#### 2.4.1 Prompt CRUD

- **创建**: 新建系统提示词
- **编辑**: 修改内容、名称、描述
- **删除**: 移除提示词
- **启用/禁用**: 控制提示词激活状态

#### 2.4.2 Markdown 编辑器

- **语法高亮**: CodeMirror 6 支持
- **实时预览**: 分屏预览模式
- **自动保存**: 定时自动保存

#### 2.4.3 配置回填

- **Live 配置读取**: 自动读取当前应用的系统提示词
- **回填机制**: 切换提示词时自动保存之前的配置
- **自动导入**: 首次启动时导入现有配置

### 2.5 代理服务 (Proxy)

#### 2.5.1 HTTP 代理服务器

- **本地服务**: 监听 `127.0.0.1:15721` (可配置)
- **多应用支持**: 支持 Claude/Codex/Gemini API 格式
- **请求路由**: 自动路由到对应供应商

#### 2.5.2 熔断器 (Circuit Breaker)

- **失败检测**: 连续失败达到阈值后熔断
- **自动恢复**: 超时后进入半开状态试探
- **状态监控**: 实时健康状态显示

#### 2.5.3 故障转移 (Failover)

- **队列管理**: 维护故障转移供应商队列
- **自动切换**: 主供应商失败时自动切换
- **优先级**: 支持设置故障转移优先级

#### 2.5.4 用量统计

- **实时记录**: 记录每次请求的用量
- **成本计算**: 根据模型定价计算成本
- **日聚合**: 自动聚合为日统计数据
- **报表展示**: 图表展示用量趋势

#### 2.5.5 高级功能

- **Thinking 优化**: 自动优化 thinking 参数
- **缓存注入**: 自动注入缓存配置
- **响应处理**: 流式响应处理
- **超时控制**: 首字超时、流式空闲超时

### 2.6 配置管理

#### 2.6.1 导入导出

- **JSON 导出**: 导出所有配置为 JSON
- **JSON 导入**: 从 JSON 恢复配置
- **SQL 备份**: 导出完整数据库
- **冲突处理**: 智能合并或替换

#### 2.6.2 WebDAV 同步

- **自动同步**: 定时自动同步到 WebDAV
- **冲突解决**: 手动选择本地/远程/合并
- **多设备**: 支持多设备配置同步

#### 2.6.3 自动备份

- **退出备份**: 应用退出时自动备份
- **保留策略**: 保留最近 10 个备份
- **恢复功能**: 从备份恢复配置

### 2.7 系统托盘

#### 2.7.1 托盘菜单

- **快速切换**: 托盘菜单直接切换供应商
- **应用分组**: 按应用分组显示供应商
- **当前标记**: 标记当前使用的供应商

#### 2.7.2 轻量模式

- **窗口销毁**: 关闭主窗口，仅保留托盘
- **资源节省**: 减少内存占用
- **快速唤醒**: 点击托盘快速恢复窗口

### 2.8 自动启动

- **开机自启**: 系统启动时自动运行
- **平台支持**: macOS、Windows、Linux

### 2.9 国际化

- **多语言**: 支持中文、英文、日文
- **自动检测**: 自动检测系统语言
- **动态切换**: 运行时切换语言

### 2.10 深度链接

- **协议注册**: `ccswitch://` 协议
- **配置导入**: 通过链接导入配置
- **安全验证**: 验证配置来源

---

## 3. 技术架构总览

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React + TS)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Providers  │  │    MCP      │  │   Prompts   │  │       Skills        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                    │
                              Tauri IPC Bridge
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (Rust)                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Commands Layer (commands/)                       ││
│  │   provider.rs │ mcp.rs │ prompt.rs │ skill.rs │ proxy.rs │ config.rs   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       Services Layer (services/)                        ││
│  │  ProviderService │ McpService │ PromptService │ SkillService │ ProxySvc  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Database Layer (database/)                       ││
│  │     Schema │ Migration │ DAO (providers/mcp/prompts/skills/settings)    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      Configuration Adapters                             ││
│  │   codex_config.rs │ gemini_config.rs │ opencode_config.rs │ ...         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Proxy Server (proxy/)                            ││
│  │   server.rs │ circuit_breaker.rs │ provider_router.rs │ handlers/...    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 数据流

```
用户操作 → 前端组件 → TanStack Query → Tauri IPC → Rust Command
                                                         ↓
Live 配置 ← 配置适配器 ← Services ← DAO ← Database
```

### 3.3 Single Source of Truth (SSOT)

**核心原则**: 所有配置统一存储在 SQLite 数据库 (`~/.cc-switch/cc-switch.db`)，各应用的配置文件为"实时视图"。

**数据流向**:

1. 用户在前端修改配置
2. 保存到 SQLite 数据库
3. 同时写入对应应用的配置文件
4. 应用读取配置文件生效

**回填机制**: 编辑当前激活的供应商时，先从 Live 配置文件读取最新配置回填到编辑表单。

---

## 4. 前端架构详解

### 4.1 目录结构

```
src/
├── App.tsx                    # 根组件，主视图路由
├── main.tsx                   # 应用入口，初始化配置
├── index.css                  # 全局样式，Tailwind + CSS 变量
├── index.html                 # HTML 模板
├── vite-env.d.ts              # Vite 类型声明

├── components/                # UI 组件（按功能分组）
│   ├── ui/                    # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── form.tsx           # react-hook-form 集成
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   └── ... (24+ 组件)
│   │
│   ├── providers/             # 供应商管理组件
│   │   ├── ProviderList.tsx   # 供应商列表（支持拖拽排序）
│   │   ├── ProviderCard.tsx   # 供应商卡片
│   │   ├── AddProviderDialog.tsx
│   │   ├── EditProviderDialog.tsx
│   │   └── forms/             # 表单组件
│   │       ├── ProviderForm.tsx
│   │       ├── BasicFormFields.tsx
│   │       ├── ApiKeyInput.tsx
│   │       ├── hooks/         # 表单专用 hooks
│   │       └── helpers/       # 表单辅助函数
│   │
│   ├── mcp/                   # MCP 服务器管理
│   ├── prompts/               # 系统提示词管理
│   ├── skills/                # Skills 管理
│   ├── settings/              # 设置页面
│   ├── sessions/              # 会话管理
│   ├── usage/                 # 用量统计
│   ├── workspace/             # 工作区管理
│   ├── proxy/                 # 代理设置
│   ├── universal/             # 统一供应商
│   ├── openclaw/              # OpenClaw 专属组件
│   ├── agents/                # Agents 面板
│   ├── common/                # 通用组件
│   └── env/                   # 环境变量警告

├── hooks/                     # 自定义 React Hooks
│   ├── useProviderActions.ts  # 供应商 CRUD 操作
│   ├── useMcp.ts              # MCP 管理
│   ├── useSettings.ts         # 设置管理（组合层）
│   ├── useSettingsForm.ts     # 设置表单状态
│   ├── usePromptActions.ts    # 提示词操作
│   ├── useDragSort.ts         # 拖拽排序
│   ├── useProxyStatus.ts      # 代理状态
│   ├── useOpenClaw.ts         # OpenClaw 状态
│   └── ...

├── lib/                       # 核心工具库
│   ├── api/                   # Tauri API 封装
│   │   ├── index.ts           # 统一导出
│   │   ├── providers.ts       # 供应商 API
│   │   ├── mcp.ts             # MCP API
│   │   ├── settings.ts        # 设置 API
│   │   ├── prompts.ts         # 提示词 API
│   │   └── ...
│   │
│   ├── query/                 # TanStack Query 配置
│   │   ├── queryClient.ts     # QueryClient 实例
│   │   ├── queries.ts         # Query Hooks
│   │   ├── mutations.ts       # Mutation Hooks
│   │   └── ...
│   │
│   ├── schemas/               # Zod 验证 Schema
│   │   ├── provider.ts        # 供应商验证
│   │   ├── mcp.ts             # MCP 验证
│   │   └── settings.ts        # 设置验证
│   │
│   ├── utils.ts               # 通用工具函数
│   ├── platform.ts            # 平台检测
│   └── updater.ts             # 更新检查

├── types/                     # TypeScript 类型定义
│   ├── index.ts               # 主类型定义
│   ├── subscription.ts        # 订阅类型
│   └── ...

├── config/                    # 配置预设
│   ├── claudeProviderPresets.ts    # Claude 供应商预设
│   ├── codexProviderPresets.ts     # Codex 供应商预设
│   ├── geminiProviderPresets.ts    # Gemini 供应商预设
│   ├── opencodeProviderPresets.ts  # OpenCode 供应商预设
│   ├── openclawProviderPresets.ts  # OpenClaw 供应商预设
│   ├── universalProviderPresets.ts # 通用供应商预设
│   ├── mcpPresets.ts               # MCP 预设
│   ├── codexTemplates.ts           # Codex 模板
│   ├── appConfig.tsx               # 应用配置组件
│   ├── constants.ts                # 常量定义
│   └── iconInference.ts            # 图标推断

├── i18n/                      # 国际化
│   ├── index.ts               # i18n 初始化
│   └── locales/               # 翻译文件
│       ├── zh.json            # 中文（2300+ 行）
│       ├── en.json            # 英文
│       └── ja.json            # 日语

├── contexts/                  # React Contexts
│   └── UpdateContext.tsx      # 更新状态

├── utils/                     # 工具函数
│   ├── errorUtils.ts          # 错误处理
│   ├── providerConfigUtils.ts # 供应商配置处理
│   ├── tomlUtils.ts           # TOML 解析
│   ├── formatters.ts          # 格式化
│   └── ...

└── assets/                    # 静态资源
    └── icons/                 # 图标
```

### 4.2 状态管理架构

#### 4.2.1 TanStack Query 配置

**QueryClient 配置** (`src/lib/query/queryClient.ts`):

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});
```

**Query Key 设计**:

```typescript
// 供应商查询
["providers", appId][
  // 用量查询（支持独立缓存失效）
  ("usage", providerId, appId)
][
  // 设置查询
  "settings"
][
  // MCP 查询
  ("mcp", "all")
];

// OpenClaw 相关
openclawKeys.health;
openclawKeys.liveProviderIds;
openclawKeys.defaultModel;
```

#### 4.2.2 API 层封装

**统一导出** (`src/lib/api/index.ts`):

```typescript
export type { AppId } from "./types";
export { providersApi, universalProvidersApi } from "./providers";
export { settingsApi } from "./settings";
export { mcpApi } from "./mcp";
export { promptsApi } from "./prompts";
export { skillsApi } from "./skills";
// ... 更多导出
```

**API 实现示例** (`src/lib/api/providers.ts`):

```typescript
export const providersApi = {
  async getAll(appId: AppId): Promise<Record<string, Provider>> {
    return await invoke("get_providers", { app: appId });
  },

  async getCurrent(appId: AppId): Promise<string> {
    return await invoke("get_current_provider", { app: appId });
  },

  async add(
    provider: Provider,
    appId: AppId,
    addToLive?: boolean,
  ): Promise<boolean> {
    return await invoke("add_provider", { provider, app: appId, addToLive });
  },

  async switch(id: string, appId: AppId): Promise<SwitchResult> {
    return await invoke("switch_provider", { id, app: appId });
  },

  // 事件监听封装
  async onSwitched(
    handler: (event: ProviderSwitchEvent) => void,
  ): Promise<UnlistenFn> {
    return await listen("provider-switched", (event) => {
      handler(event.payload as ProviderSwitchEvent);
    });
  },
};
```

### 4.3 表单处理模式

**react-hook-form + Zod 集成** (`src/components/ui/form.tsx`):

```typescript
// Form 组件封装了 react-hook-form 的上下文
const Form = FormProvider;

// FormField 连接 Controller 和表单上下文
const FormField = <TFieldValues extends FieldValues>({
  ...props
}: ControllerProps<TFieldValues>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// 使用示例
<Form {...form}>
  <FormField
    control={form.control}
    name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>名称</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

**验证 Schema** (`src/lib/schemas/provider.ts`):

```typescript
export const providerSchema = z.object({
  name: z.string(),
  websiteUrl: z.string().url("请输入有效的网址").optional().or(z.literal("")),
  notes: z.string().optional(),
  settingsConfig: z
    .string()
    .min(1, "请填写配置内容")
    .superRefine((value, ctx) => {
      try {
        JSON.parse(value);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: parseJsonError(error),
        });
      }
    }),
});
```

### 4.4 关键 Hooks

#### useProviderActions

**职责**: 封装供应商的所有业务操作（CRUD + 切换）

```typescript
export function useProviderActions(activeApp: AppId, isProxyRunning?: boolean) {
  // 返回值
  return {
    addProvider, // 添加供应商（含 OpenClaw 模型注册）
    updateProvider, // 更新供应商
    switchProvider, // 切换供应商（含代理检测）
    deleteProvider, // 删除供应商
    saveUsageScript, // 保存用量查询脚本
    setAsDefaultModel, // OpenClaw 设默认模型
    isLoading, // 组合 loading 状态
  };
}
```

#### useSettings

**职责**: 组合层，协调设置表单、目录设置和元数据管理

```typescript
export function useSettings(): UseSettingsResult {
  // 1️⃣ 表单状态管理
  const { settings, updateSettings, ... } = useSettingsForm();

  // 2️⃣ 目录管理
  const { appConfigDir, browseDirectory, ... } = useDirectorySettings({...});

  // 3️⃣ 元数据管理
  const { isPortable, requiresRestart, ... } = useSettingsMetadata();

  return {
    settings,
    isLoading,
    saveSettings,      // 完整保存（Advanced 标签页）
    autoSaveSettings,  // 即时保存（General 标签页）
    // ...
  };
}
```

#### useMcp

**职责**: MCP 服务器的统一状态管理

```typescript
export function useAllMcpServers() {
  return useQuery({
    queryKey: ["mcp", "all"],
    queryFn: () => mcpApi.getAllServers(),
  });
}

export function useUpsertMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (server: McpServer) => mcpApi.upsertUnifiedServer(server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "all"] });
    },
  });
}
```

### 4.5 预设配置系统

#### Claude 供应商预设 (`src/config/claudeProviderPresets.ts`)

```typescript
export interface ProviderPreset {
  name: string;
  nameKey?: string; // i18n key
  websiteUrl: string;
  apiKeyUrl?: string; // 获取 API Key 的链接
  settingsConfig: object;
  isOfficial?: boolean;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  category?: ProviderCategory;
  apiKeyField?: "ANTHROPIC_AUTH_TOKEN" | "ANTHROPIC_API_KEY";
  templateValues?: Record<string, TemplateValueConfig>;
  endpointCandidates?: string[]; // 测速地址候选
  theme?: PresetTheme;
  icon?: string;
  iconColor?: string;
  apiFormat?: "anthropic" | "openai_chat" | "openai_responses";
  providerType?: "github_copilot";
  requiresOAuth?: boolean;
}

// 预设列表
export const providerPresets: ProviderPreset[] = [
  {
    name: "Claude Official",
    websiteUrl: "https://www.anthropic.com/claude-code",
    isOfficial: true,
    category: "official",
    theme: {
      icon: "claude",
      backgroundColor: "#D97757",
      textColor: "#FFFFFF",
    },
  },
  // ... 更多预设
];
```

### 4.6 国际化架构

**初始化** (`src/i18n/index.ts`):

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(), // 本地存储或系统语言
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React 已转义
  },
});
```

**中文翻译文件结构** (`src/i18n/locales/zh.json`):

```json
{
  "app": {
    "title": "CC Switch",
    "description": "Claude Code / Codex / Gemini CLI 全方位辅助工具"
  },
  "common": {
    "add": "添加",
    "edit": "编辑",
    "delete": "删除",
    "save": "保存"
  },
  "provider": {
    "noProviders": "还没有添加任何供应商",
    "currentlyUsing": "当前使用",
    "form": {
      "gemini": {
        "model": "模型",
        "oauthTitle": "OAuth 认证模式"
      }
    }
  },
  "notifications": {
    "providerAdded": "供应商已添加",
    "switchSuccess": "切换成功！"
  }
}
```

---

## 5. 后端架构详解

### 5.1 目录结构

```
src-tauri/src/
├── lib.rs                    # 主库入口
├── main.rs                   # 程序入口
├── error.rs                  # 错误处理
├── provider.rs               # Provider模型
├── app_config.rs             # 应用配置
├── settings.rs               # 设置管理
├── tray.rs                   # 系统托盘
├── lightweight.rs            # 轻量模式
├── auto_launch.rs            # 自动启动
├── panic_hook.rs             # Panic处理
├── store.rs                  # 应用存储
├── codex_config.rs           # Codex配置适配
├── gemini_config.rs          # Gemini配置适配
├── opencode_config.rs        # OpenCode配置适配
├── openclaw_config.rs        # OpenClaw配置适配
├── claude_mcp.rs             # Claude MCP管理
├── gemini_mcp.rs             # Gemini MCP管理
├── prompt_files.rs           # Prompt文件管理
├── usage_script.rs           # 用量脚本
├── config.rs                 # 配置管理
├── provider_defaults.rs      # 供应商默认值
├── init_status.rs            # 初始化状态

├── commands/                 # Tauri命令层
│   ├── provider.rs           # Provider命令
│   ├── mcp.rs                # MCP命令
│   ├── prompt.rs             # Prompt命令
│   ├── skill.rs              # Skills命令
│   ├── proxy.rs              # 代理命令
│   ├── config.rs             # 配置命令
│   ├── settings.rs           # 设置命令
│   ├── deeplink.rs           # 深度链接
│   ├── auth.rs               # 认证命令
│   └── ...

├── services/                 # 业务逻辑层
│   ├── mod.rs
│   ├── provider/             # Provider服务
│   │   ├── mod.rs
│   │   └── live.rs
│   ├── mcp.rs                # MCP服务
│   ├── prompt.rs             # Prompt服务
│   ├── skill.rs              # Skills服务
│   ├── config.rs             # 配置服务
│   ├── proxy.rs              # 代理服务
│   ├── subscription.rs       # 订阅服务
│   ├── usage_stats.rs        # 用量统计
│   ├── stream_check.rs       # 流式检查
│   ├── speedtest.rs          # 测速
│   ├── webdav.rs             # WebDAV
│   ├── webdav_auto_sync.rs   # WebDAV自动同步
│   ├── webdav_sync.rs        # WebDAV同步
│   ├── omo.rs                # OMO服务
│   ├── model_fetch.rs        # 模型获取
│   ├── env_checker.rs        # 环境检查
│   ├── env_manager.rs        # 环境管理
│   └── coding_plan.rs        # 编程计划

├── database/                 # 数据库层
│   ├── mod.rs                # Database结构体
│   ├── schema.rs             # Schema定义
│   ├── migration.rs          # 迁移脚本
│   ├── backup.rs             # 备份管理
│   ├── tests.rs              # 测试
│   └── dao/                  # 数据访问对象
│       ├── mod.rs
│       ├── providers.rs
│       ├── mcp.rs
│       ├── prompts.rs
│       ├── skills.rs
│       ├── settings.rs
│       ├── proxy.rs
│       ├── failover.rs
│       └── usage_rollup.rs

├── proxy/                    # 代理服务器
│   ├── mod.rs
│   ├── server.rs             # HTTP服务器
│   ├── types.rs              # 类型定义
│   ├── handlers.rs           # 请求处理器
│   ├── provider_router.rs    # 供应商路由
│   ├── circuit_breaker.rs    # 熔断器
│   ├── failover_switch.rs    # 故障转移
│   ├── forwarder.rs          # 请求转发
│   ├── response_handler.rs   # 响应处理
│   ├── thinking_optimizer.rs # Thinking优化
│   ├── thinking_budget_rectifier.rs
│   ├── thinking_rectifier.rs
│   ├── cache_injector.rs     # 缓存注入
│   ├── copilot_optimizer.rs  # Copilot优化
│   ├── hyper_client.rs       # HTTP客户端
│   ├── http_client.rs
│   ├── session.rs            # 会话管理
│   ├── health.rs             # 健康检查
│   ├── error.rs              # 错误处理
│   ├── error_mapper.rs       # 错误映射
│   ├── sse.rs                # SSE处理
│   ├── body_filter.rs        # Body过滤
│   ├── log_codes.rs          # 日志代码
│   ├── switch_lock.rs        # 切换锁
│   ├── handler_context.rs    # 处理器上下文
│   ├── handler_config.rs     # 处理器配置
│   └── usage/                # 用量统计
│       ├── mod.rs
│       ├── calculator.rs
│       ├── parser.rs
│       └── logger.rs

├── mcp/                      # MCP模块
│   ├── mod.rs
│   ├── validation.rs         # 验证
│   ├── claude.rs             # Claude适配
│   ├── codex.rs              # Codex适配
│   ├── gemini.rs             # Gemini适配
│   └── opencode.rs           # OpenCode适配

├── deeplink/                 # 深度链接
│   ├── mod.rs
│   ├── provider.rs
│   ├── mcp.rs
│   ├── skill.rs
│   └── prompt.rs

└── session_manager/          # 会话管理
    ├── mod.rs
    └── ...
```

### 5.2 核心模块

#### 5.2.1 主入口 (`lib.rs`)

`lib.rs` 是整个后端的核心入口，主要职责包括：

1. **模块声明与导出**: 声明并导出所有子模块
2. **Tauri 应用构建**: 配置和构建 Tauri 应用实例
3. **初始化流程**:
   - Panic Hook 设置（崩溃日志记录）
   - 单实例检查（防止多开）
   - 数据库初始化与迁移
   - 深链接协议注册 (`ccswitch://`)
   - 系统托盘创建
   - 日志系统配置
   - 自动导入逻辑（MCP、Prompts、Skills）

**关键初始化流程**:

```rust
pub fn run() {
    panic_hook::setup_panic_hook();  // 崩溃日志

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(...))  // 单实例
        .plugin(tauri_plugin_deep_link::init())            // 深链接
        .setup(|app| {
            // 1. 数据库初始化
            let db = Database::init()?;

            // 2. 数据迁移（JSON → SQLite）
            if let Some(config) = migration_config {
                db.migrate_from_json(&config)?;
            }

            // 3. 自动导入
            import_mcp_from_apps(&app_state)?;
            import_prompts_from_files(&app_state)?;

            // 4. 创建托盘菜单
            let menu = tray::create_tray_menu(app.handle(), &app_state)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![...]);  // 注册命令
}
```

#### 5.2.2 错误处理 (`error.rs`)

定义了统一的错误类型 `AppError`，使用 `thiserror` 宏实现：

```rust
#[derive(Debug, Error)]
pub enum AppError {
    #[error("配置错误: {0}")]
    Config(String),

    #[error("IO 错误: {path}: {source}")]
    Io { path: String, source: std::io::Error },

    #[error("JSON 解析错误: {path}: {source}")]
    Json { path: String, source: serde_json::Error },

    #[error("数据库错误: {0}")]
    Database(String),

    #[error("所有供应商已熔断，无可用渠道")]
    AllProvidersCircuitOpen,

    // ... 其他变体
}
```

**特点**:

- 支持结构化错误（包含路径、源错误等上下文）
- 实现 `Serialize` trait 以便传递给前端
- 提供 `localized` 方法支持多语言错误消息

#### 5.2.3 Provider 模型 (`provider.rs`)

定义了核心的供应商数据结构：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub settings_config: Value,          // 应用特定的配置（JSON）
    pub website_url: Option<String>,
    pub category: Option<String>,        // 供应商分类
    pub created_at: Option<i64>,
    pub sort_index: Option<usize>,       // 排序索引
    pub notes: Option<String>,
    pub meta: Option<ProviderMeta>,      // 扩展元数据
    pub icon: Option<String>,
    pub icon_color: Option<String>,
    pub in_failover_queue: bool,         // 是否在故障转移队列
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProviderMeta {
    pub custom_endpoints: HashMap<String, CustomEndpoint>,
    pub common_config_enabled: Option<bool>,
    pub usage_script: Option<UsageScript>,     // 用量查询脚本
    pub endpoint_auto_select: Option<bool>,
    pub cost_multiplier: Option<String>,       // 成本倍数
    pub pricing_model_source: Option<String>,  // 计费模式
    pub test_config: Option<ProviderTestConfig>,
    pub proxy_config: Option<ProviderProxyConfig>,
    pub api_format: Option<String>,            // Claude API 格式
    pub auth_binding: Option<AuthBinding>,     // 认证绑定
    pub provider_type: Option<String>,         // 供应商类型标识
    pub github_account_id: Option<String>,     // GitHub Copilot 账号
}
```

#### 5.2.4 应用配置 (`app_config.rs`)

定义了应用类型枚举和多应用配置结构：

```rust
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AppType {
    Claude,
    Codex,
    Gemini,
    OpenCode,
    OpenClaw,
}

impl AppType {
    /// 是否使用累加模式（写入所有供应商到 live config）
    pub fn is_additive_mode(&self) -> bool {
        matches!(self, AppType::OpenCode | AppType::OpenClaw)
    }
}
```

**MCP 和 Skills 的应用启用状态**:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct McpApps {
    #[serde(default)]
    pub claude: bool,
    pub codex: bool,
    pub gemini: bool,
    pub opencode: bool,
}

pub struct InstalledSkill {
    pub id: String,           // 格式: "owner/repo:directory" 或 "local:directory"
    pub name: String,
    pub directory: String,    // SSOT 目录中的子目录名
    pub repo_owner: Option<String>,
    pub repo_name: Option<String>,
    pub apps: SkillApps,      // 应用启用状态
    pub installed_at: i64,
}
```

### 5.3 Commands 层

Commands 层是前端与后端交互的接口，每个模块对应一个命令文件：

| 文件          | 职责                          |
| ------------- | ----------------------------- |
| `provider.rs` | 供应商 CRUD、切换、排序       |
| `mcp.rs`      | MCP 服务器管理                |
| `prompt.rs`   | 系统提示词管理                |
| `skill.rs`    | Skills 管理（安装/卸载/切换） |
| `proxy.rs`    | 代理服务器控制、故障转移      |
| `config.rs`   | 配置导入/导出/备份            |
| `settings.rs` | 应用设置管理                  |
| `deeplink.rs` | 深链接协议处理                |
| `auth.rs`     | 托管认证管理                  |

**命令注册示例** (在 `lib.rs` 中):

```rust
.invoke_handler(tauri::generate_handler![
    commands::get_providers,
    commands::add_provider,
    commands::update_provider,
    commands::delete_provider,
    commands::switch_provider,
    // ... 100+ 命令
])
```

### 5.4 Services 层

Services 层封装业务逻辑，是 Commands 层与数据库层之间的桥梁。

#### ProviderService

**文件**: `services/provider/mod.rs`

核心职责：

- 供应商 CRUD 操作
- 供应商切换（写入 live config）
- 配置验证
- 累加模式支持（OpenCode/OpenClaw）

```rust
impl ProviderService {
    pub fn list(state: &AppState, app_type: AppType) -> Result<IndexMap<String, Provider>, AppError>;
    pub fn add(state: &AppState, app_type: AppType, provider: Provider, add_to_live: bool) -> Result<bool, AppError>;
    pub fn update(state: &AppState, app_type: AppType, original_id: Option<&str>, provider: Provider) -> Result<bool, AppError>;
    pub fn delete(state: &AppState, app_type: AppType, id: &str) -> Result<(), AppError>;
    pub fn switch(state: &AppState, app_type: AppType, provider_id: &str) -> Result<SwitchResult, AppError>;
}
```

#### ProxyService

**文件**: `services/proxy.rs` (2790 行)

代理服务的业务逻辑层：

```rust
pub struct ProxyService {
    db: Arc<Database>,
    server: Arc<RwLock<Option<ProxyServer>>>,
    app_handle: Arc<RwLock<Option<tauri::AppHandle>>>,
    switch_locks: SwitchLockManager,
}

impl ProxyService {
    pub async fn start(&self) -> Result<ProxyServerInfo, String>;
    pub async fn stop(&self) -> Result<(), String>;
    pub async fn start_with_takeover(&self) -> Result<ProxyServerInfo, String>;
    pub async fn set_takeover_for_app(&self, app_type: &str, enabled: bool) -> Result<(), String>;
    pub async fn switch_proxy_target(&self, app_type: &str, provider_id: &str) -> Result<(), String>;
    pub async fn recover_from_crash(&self) -> Result<(), String>;
}
```

**关键功能**:

- Live 配置接管/恢复
- Token 同步
- 热切换支持
- 崩溃恢复

### 5.5 代理服务层

#### HTTP 代理服务器

**文件**: `proxy/server.rs` (357 行)

```rust
pub struct ProxyServer {
    config: ProxyConfig,
    state: ProxyState,
    shutdown_tx: Arc<RwLock<Option<oneshot::Sender<()>>>>,
    server_handle: Arc<RwLock<Option<JoinHandle<()>>>>,
}

pub struct ProxyState {
    pub db: Arc<Database>,
    pub config: Arc<RwLock<ProxyConfig>>,
    pub status: Arc<RwLock<ProxyStatus>>,
    pub provider_router: Arc<ProviderRouter>,
    pub failover_manager: Arc<FailoverSwitchManager>,
    pub app_handle: Option<tauri::AppHandle>,
}
```

**API 路由**:

- `POST /v1/messages` - Claude API
- `POST /chat/completions` - OpenAI Chat Completions
- `POST /responses` - OpenAI Responses API
- `POST /v1beta/*` - Gemini API

#### 熔断器 (Circuit Breaker)

**文件**: `proxy/circuit_breaker.rs`

```rust
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    state: Arc<RwLock<CircuitState>>,
    stats: Arc<RwLock<FailureStats>>,
}

pub enum CircuitState {
    Closed,      // 正常
    Open,        // 熔断
    HalfOpen,    // 半开（试探）
}
```

**熔断策略**:

- 失败阈值: 默认 4 次
- 成功阈值: 默认 2 次
- 超时时间: 默认 60 秒
- 错误率阈值: 默认 60%
- 最小请求数: 默认 10

### 5.6 配置管理

#### 各应用配置适配器

| 应用     | 配置文件                             | 适配器文件           |
| -------- | ------------------------------------ | -------------------- |
| Claude   | `~/.claude/settings.json`            | `config.rs` (通用)   |
| Codex    | `~/.codex/auth.json` + `config.toml` | `codex_config.rs`    |
| Gemini   | `~/.gemini/.env` + `settings.json`   | `gemini_config.rs`   |
| OpenCode | `~/.config/opencode/opencode.json`   | `opencode_config.rs` |
| OpenClaw | `~/.config/openclaw/openclaw.json`   | `openclaw_config.rs` |

#### Codex 配置管理

**文件**: `codex_config.rs` (470 行)

```rust
/// 原子写 Codex 的 `auth.json` 与 `config.toml`
pub fn write_codex_live_atomic(auth: &Value, config_text_opt: Option<&str>) -> Result<(), AppError>;

/// 使用 toml_edit 语法保留地更新字段
pub fn update_codex_toml_field(toml_str: &str, field: &str, value: &str) -> Result<String, String>;
```

#### Gemini 配置管理

**文件**: `gemini_config.rs` (654 行)

```rust
pub fn read_gemini_env() -> Result<HashMap<String, String>, AppError>;
pub fn write_gemini_env_atomic(map: &HashMap<String, String>) -> Result<(), AppError>;
pub fn validate_gemini_settings(settings: &Value) -> Result<(), AppError>;
pub fn validate_gemini_settings_strict(settings: &Value) -> Result<(), AppError>;
```

### 5.7 MCP 管理

**目录**: `src-tauri/src/mcp/`

```rust
// mcp/mod.rs
pub use claude::{import_from_claude, sync_enabled_to_claude, ...};
pub use codex::{import_from_codex, sync_enabled_to_codex, ...};
pub use gemini::{import_from_gemini, sync_enabled_to_gemini, ...};
pub use opencode::{import_from_opencode, sync_single_server_to_opencode, ...};
```

**跨应用同步策略**:

1. 统一存储在 `mcp_servers` 表
2. 每个服务器有独立的启用标志 (`enabled_claude`, `enabled_codex`, etc.)
3. 变更时同步到对应应用的配置文件

---

## 6. 数据库设计

### 6.1 数据库文件位置

```
~/.cc-switch/cc-switch.db
```

### 6.2 当前 Schema 版本

```
SCHEMA_VERSION = 6
```

### 6.3 完整 ER 图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CC Switch Database                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐         ┌──────────────────────┐                           │
│  │    providers    │◄───────►│  provider_endpoints  │                           │
│  │   (复合主键)     │         │    (外键关联)         │                           │
│  │  PK: id+app_type│         │  FK: provider_id,    │                           │
│  └────────┬────────┘         │      app_type        │                           │
│           │                  └──────────────────────┘                           │
│           │                                                                       │
│           │         ┌──────────────────────┐                                     │
│           └────────►│   provider_health    │                                     │
│                     │ (健康状态监控表)      │                                     │
│                     │  FK: provider_id,    │                                     │
│                     │      app_type        │                                     │
│                     └──────────────────────┘                                     │
│                                                                                  │
│  ┌─────────────────┐         ┌──────────────────────┐                           │
│  │   mcp_servers   │         │       skills         │                           │
│  │   (单主键)       │         │    (单主键)          │                           │
│  │  PK: id         │         │   PK: id             │                           │
│  │  启用标记:       │         │   启用标记:           │                           │
│  │  enabled_claude │         │  enabled_claude      │                           │
│  │  enabled_codex  │         │  enabled_codex       │                           │
│  │  enabled_gemini │         │  enabled_gemini      │                           │
│  │  enabled_opencode│        │  enabled_opencode    │                           │
│  └─────────────────┘         └──────────┬───────────┘                           │
│                                         │                                        │
│                              ┌──────────┴───────────┐                           │
│                              │     skill_repos      │                           │
│                              │   (复合主键)          │                           │
│                              │  PK: owner+name      │                           │
│                              └──────────────────────┘                           │
│                                                                                  │
│  ┌─────────────────┐         ┌──────────────────────┐                           │
│  │     prompts     │         │      settings        │                           │
│  │   (复合主键)     │         │    (KV存储)          │                           │
│  │  PK: id+app_type│         │   PK: key            │                           │
│  └─────────────────┘         └──────────────────────┘                           │
│                                                                                  │
│  ┌─────────────────┐         ┌──────────────────────┐                           │
│  │   proxy_config  │         │  proxy_request_logs  │                           │
│  │   (每应用三行)   │         │   (请求日志表)        │                           │
│  │  PK: app_type   │         │   PK: request_id     │                           │
│  │  CHECK约束限制   │         │   多索引优化查询      │                           │
│  │  app_type取值    │         │                      │                           │
│  └─────────────────┘         └──────────┬───────────┘                           │
│                                         │                                        │
│                              ┌──────────┴───────────┐                           │
│                              │  usage_daily_rollups │                           │
│                              │   (日聚合统计表)      │                           │
│                              │  PK: date+app_type+  │                           │
│                              │      provider_id+    │                           │
│                              │      model           │                           │
│                              └──────────────────────┘                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 表结构详细说明

#### 6.4.1 `providers` - 供应商配置表

| 字段名              | 类型    | 约束                   | 说明                                    |
| ------------------- | ------- | ---------------------- | --------------------------------------- |
| `id`                | TEXT    | NOT NULL, PK (复合)    | 供应商唯一标识                          |
| `app_type`          | TEXT    | NOT NULL, PK (复合)    | 应用类型 (claude/codex/gemini/opencode) |
| `name`              | TEXT    | NOT NULL               | 供应商显示名称                          |
| `settings_config`   | TEXT    | NOT NULL               | 配置JSON (序列化后的serde_json::Value)  |
| `website_url`       | TEXT    | -                      | 官网链接                                |
| `category`          | TEXT    | -                      | 分类 (omo/omo-slim/aggregator等)        |
| `created_at`        | INTEGER | -                      | 创建时间戳 (Unix毫秒)                   |
| `sort_index`        | INTEGER | -                      | 排序索引                                |
| `notes`             | TEXT    | -                      | 备注信息                                |
| `icon`              | TEXT    | -                      | 图标名称                                |
| `icon_color`        | TEXT    | -                      | 图标颜色 (Hex)                          |
| `meta`              | TEXT    | NOT NULL, DEFAULT '{}' | 元数据JSON (ProviderMeta序列化)         |
| `is_current`        | BOOLEAN | NOT NULL, DEFAULT 0    | 是否为当前选中供应商                    |
| `in_failover_queue` | BOOLEAN | NOT NULL, DEFAULT 0    | 是否在故障转移队列                      |

**索引**:

```sql
CREATE INDEX idx_providers_failover ON providers(app_type, in_failover_queue, sort_index);
```

#### 6.4.2 `mcp_servers` - MCP服务器配置表

| 字段名             | 类型    | 约束                   | 说明             |
| ------------------ | ------- | ---------------------- | ---------------- |
| `id`               | TEXT    | PRIMARY KEY            | 服务器唯一标识   |
| `name`             | TEXT    | NOT NULL               | 显示名称         |
| `server_config`    | TEXT    | NOT NULL               | 服务器配置JSON   |
| `description`      | TEXT    | -                      | 描述             |
| `homepage`         | TEXT    | -                      | 主页链接         |
| `docs`             | TEXT    | -                      | 文档链接         |
| `tags`             | TEXT    | NOT NULL, DEFAULT '[]' | 标签JSON数组     |
| `enabled_claude`   | BOOLEAN | NOT NULL, DEFAULT 0    | Claude启用状态   |
| `enabled_codex`    | BOOLEAN | NOT NULL, DEFAULT 0    | Codex启用状态    |
| `enabled_gemini`   | BOOLEAN | NOT NULL, DEFAULT 0    | Gemini启用状态   |
| `enabled_opencode` | BOOLEAN | NOT NULL, DEFAULT 0    | OpenCode启用状态 |

#### 6.4.3 `skills` - Skills配置表 (v3.10.0+ 统一结构)

| 字段名             | 类型    | 约束                | 说明                                       |
| ------------------ | ------- | ------------------- | ------------------------------------------ |
| `id`               | TEXT    | PRIMARY KEY         | Skill唯一标识 (格式: owner/repo:directory) |
| `name`             | TEXT    | NOT NULL            | 显示名称                                   |
| `description`      | TEXT    | -                   | 描述                                       |
| `directory`        | TEXT    | NOT NULL            | 安装目录名                                 |
| `repo_owner`       | TEXT    | -                   | GitHub仓库所有者                           |
| `repo_name`        | TEXT    | -                   | GitHub仓库名称                             |
| `repo_branch`      | TEXT    | DEFAULT 'main'      | 仓库分支                                   |
| `readme_url`       | TEXT    | -                   | README链接                                 |
| `enabled_claude`   | BOOLEAN | NOT NULL, DEFAULT 0 | Claude启用                                 |
| `enabled_codex`    | BOOLEAN | NOT NULL, DEFAULT 0 | Codex启用                                  |
| `enabled_gemini`   | BOOLEAN | NOT NULL, DEFAULT 0 | Gemini启用                                 |
| `enabled_opencode` | BOOLEAN | NOT NULL, DEFAULT 0 | OpenCode启用                               |
| `installed_at`     | INTEGER | NOT NULL, DEFAULT 0 | 安装时间戳                                 |

#### 6.4.4 `proxy_config` - 代理配置表 (三行结构)

| 字段名                         | 类型    | 约束                                | 说明                           |
| ------------------------------ | ------- | ----------------------------------- | ------------------------------ |
| `app_type`                     | TEXT    | PRIMARY KEY                         | 应用类型 (claude/codex/gemini) |
| `proxy_enabled`                | INTEGER | NOT NULL, DEFAULT 0                 | 代理总开关                     |
| `listen_address`               | TEXT    | NOT NULL, DEFAULT '127.0.0.1'       | 监听地址                       |
| `listen_port`                  | INTEGER | NOT NULL, DEFAULT 15721             | 监听端口                       |
| `enable_logging`               | INTEGER | NOT NULL, DEFAULT 1                 | 日志开关                       |
| `enabled`                      | INTEGER | NOT NULL, DEFAULT 0                 | 接管状态                       |
| `auto_failover_enabled`        | INTEGER | NOT NULL, DEFAULT 0                 | 自动故障转移                   |
| `max_retries`                  | INTEGER | NOT NULL, DEFAULT 3                 | 最大重试次数                   |
| `streaming_first_byte_timeout` | INTEGER | NOT NULL, DEFAULT 60                | 流式首字超时                   |
| `streaming_idle_timeout`       | INTEGER | NOT NULL, DEFAULT 120               | 流式静默超时                   |
| `non_streaming_timeout`        | INTEGER | NOT NULL, DEFAULT 600               | 非流式超时                     |
| `circuit_failure_threshold`    | INTEGER | NOT NULL, DEFAULT 4                 | 熔断失败阈值                   |
| `circuit_success_threshold`    | INTEGER | NOT NULL, DEFAULT 2                 | 熔断恢复阈值                   |
| `circuit_timeout_seconds`      | INTEGER | NOT NULL, DEFAULT 60                | 熔断等待时间                   |
| `circuit_error_rate_threshold` | REAL    | NOT NULL, DEFAULT 0.6               | 错误率阈值                     |
| `circuit_min_requests`         | INTEGER | NOT NULL, DEFAULT 10                | 最小请求数                     |
| `default_cost_multiplier`      | TEXT    | NOT NULL, DEFAULT '1'               | 默认成本倍率                   |
| `pricing_model_source`         | TEXT    | NOT NULL, DEFAULT 'response'        | 计费模式                       |
| `live_takeover_active`         | INTEGER | NOT NULL, DEFAULT 0                 | 接管激活状态                   |
| `created_at`                   | TEXT    | NOT NULL, DEFAULT (datetime('now')) | 创建时间                       |
| `updated_at`                   | TEXT    | NOT NULL, DEFAULT (datetime('now')) | 更新时间                       |

**CHECK约束**:

```sql
CHECK (app_type IN ('claude','codex','gemini'))
```

#### 6.4.5 `proxy_request_logs` - 代理请求日志表

| 字段名                    | 类型    | 约束                    | 说明                |
| ------------------------- | ------- | ----------------------- | ------------------- |
| `request_id`              | TEXT    | PRIMARY KEY             | 请求唯一标识 (UUID) |
| `provider_id`             | TEXT    | NOT NULL                | 供应商ID            |
| `app_type`                | TEXT    | NOT NULL                | 应用类型            |
| `model`                   | TEXT    | NOT NULL                | 实际使用的模型      |
| `request_model`           | TEXT    | -                       | 请求的模型          |
| `input_tokens`            | INTEGER | NOT NULL, DEFAULT 0     | 输入Token数         |
| `output_tokens`           | INTEGER | NOT NULL, DEFAULT 0     | 输出Token数         |
| `cache_read_tokens`       | INTEGER | NOT NULL, DEFAULT 0     | 缓存读取Token       |
| `cache_creation_tokens`   | INTEGER | NOT NULL, DEFAULT 0     | 缓存创建Token       |
| `input_cost_usd`          | TEXT    | NOT NULL, DEFAULT '0'   | 输入成本            |
| `output_cost_usd`         | TEXT    | NOT NULL, DEFAULT '0'   | 输出成本            |
| `cache_read_cost_usd`     | TEXT    | NOT NULL, DEFAULT '0'   | 缓存读取成本        |
| `cache_creation_cost_usd` | TEXT    | NOT NULL, DEFAULT '0'   | 缓存创建成本        |
| `total_cost_usd`          | TEXT    | NOT NULL, DEFAULT '0'   | 总成本              |
| `latency_ms`              | INTEGER | NOT NULL                | 延迟(毫秒)          |
| `first_token_ms`          | INTEGER | -                       | 首字延迟            |
| `duration_ms`             | INTEGER | -                       | 持续时间            |
| `status_code`             | INTEGER | NOT NULL                | HTTP状态码          |
| `error_message`           | TEXT    | -                       | 错误信息            |
| `session_id`              | TEXT    | -                       | 会话ID              |
| `provider_type`           | TEXT    | -                       | 供应商类型          |
| `is_streaming`            | INTEGER | NOT NULL, DEFAULT 0     | 是否流式            |
| `cost_multiplier`         | TEXT    | NOT NULL, DEFAULT '1.0' | 成本倍率            |
| `created_at`              | INTEGER | NOT NULL                | 创建时间戳          |

**索引**:

```sql
CREATE INDEX idx_request_logs_provider ON proxy_request_logs(provider_id, app_type);
CREATE INDEX idx_request_logs_created_at ON proxy_request_logs(created_at);
CREATE INDEX idx_request_logs_model ON proxy_request_logs(model);
CREATE INDEX idx_request_logs_session ON proxy_request_logs(session_id);
CREATE INDEX idx_request_logs_status ON proxy_request_logs(status_code);
```

#### 6.4.6 `usage_daily_rollups` - 使用量日聚合表

| 字段名                  | 类型    | 约束                  | 说明              |
| ----------------------- | ------- | --------------------- | ----------------- |
| `date`                  | TEXT    | NOT NULL, PK (复合)   | 日期 (YYYY-MM-DD) |
| `app_type`              | TEXT    | NOT NULL, PK (复合)   | 应用类型          |
| `provider_id`           | TEXT    | NOT NULL, PK (复合)   | 供应商ID          |
| `model`                 | TEXT    | NOT NULL, PK (复合)   | 模型名称          |
| `request_count`         | INTEGER | NOT NULL, DEFAULT 0   | 请求总数          |
| `success_count`         | INTEGER | NOT NULL, DEFAULT 0   | 成功数            |
| `input_tokens`          | INTEGER | NOT NULL, DEFAULT 0   | 输入Token         |
| `output_tokens`         | INTEGER | NOT NULL, DEFAULT 0   | 输出Token         |
| `cache_read_tokens`     | INTEGER | NOT NULL, DEFAULT 0   | 缓存读取          |
| `cache_creation_tokens` | INTEGER | NOT NULL, DEFAULT 0   | 缓存创建          |
| `total_cost_usd`        | TEXT    | NOT NULL, DEFAULT '0' | 总成本            |
| `avg_latency_ms`        | INTEGER | NOT NULL, DEFAULT 0   | 平均延迟          |

### 6.5 数据库版本迁移历史

| 版本     | 迁移内容       | 主要变更                                                                           |
| -------- | -------------- | ---------------------------------------------------------------------------------- |
| v0 -> v1 | 补齐缺失列     | 为所有表添加缺失字段，设置默认值                                                   |
| v1 -> v2 | 使用统计和重构 | 添加 `proxy_request_logs`, `model_pricing`, 重构 `skills` 表结构，添加故障转移队列 |
| v2 -> v3 | Skills统一管理 | 将Skills从 (directory, app_type) 复合主键迁移到 id 主键，SSOT迁移到文件系统        |
| v3 -> v4 | OpenCode支持   | 为 `mcp_servers` 和 `skills` 表添加 `enabled_opencode` 列                          |
| v4 -> v5 | 计费模式       | 添加 `default_cost_multiplier`, `pricing_model_source` 字段，`request_model` 字段  |
| v5 -> v6 | 日聚合统计     | 添加 `usage_daily_rollups` 表，统一 Copilot 模板类型为 `github_copilot`            |

### 6.6 DAO 模式设计

**架构设计**:

```
┌─────────────────────────────────────────────────────────┐
│                      Database 结构体                      │
│                   (封装 Mutex<Connection>)               │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  providers   │   │   dao/mod.rs │   │    proxy     │
│    .rs       │   │   (模块导出)  │   │    .rs       │
└──────────────┘   └──────────────┘   └──────────────┘
        │                                    │
   ┌────┴────┐                          ┌────┴────┐
   ▼         ▼                          ▼         ▼
get_all  save_provider            get_proxy_config
get_by_id delete_provider         update_proxy_config
set_current ...                   ...
```

**核心 DAO 方法概览**:

| DAO文件           | 主要方法                     | 功能                     |
| ----------------- | ---------------------------- | ------------------------ |
| `providers.rs`    | `get_all_providers`          | 获取指定应用的所有供应商 |
|                   | `get_provider_by_id`         | 根据ID获取供应商         |
|                   | `save_provider`              | 保存/更新供应商          |
|                   | `delete_provider`            | 删除供应商               |
|                   | `set_current_provider`       | 设置当前供应商           |
|                   | `add/remove_custom_endpoint` | 管理自定义端点           |
| `mcp.rs`          | `get_all_mcp_servers`        | 获取所有MCP服务器        |
|                   | `save_mcp_server`            | 保存MCP服务器            |
|                   | `delete_mcp_server`          | 删除MCP服务器            |
| `skills.rs`       | `get_all_installed_skills`   | 获取所有Skills           |
|                   | `save_skill`                 | 保存Skill                |
|                   | `update_skill_apps`          | 更新应用启用状态         |
|                   | `get_skill_repos`            | 获取仓库列表             |
| `prompts.rs`      | `get_prompts`                | 获取提示词列表           |
|                   | `save_prompt`                | 保存提示词               |
|                   | `delete_prompt`              | 删除提示词               |
| `settings.rs`     | `get_setting`/`set_setting`  | 通用KV操作               |
|                   | `get_config_snippet`         | 获取配置片段             |
|                   | `get_rectifier_config`       | 获取整流器配置           |
| `proxy.rs`        | `get_global_proxy_config`    | 获取全局代理配置         |
|                   | `get_proxy_config_for_app`   | 获取应用级配置           |
|                   | `update_provider_health`     | 更新健康状态             |
|                   | `save_live_backup`           | 备份Live配置             |
| `failover.rs`     | `get_failover_queue`         | 获取故障转移队列         |
|                   | `add_to_failover_queue`      | 添加到队列               |
|                   | `remove_from_failover_queue` | 从队列移除               |
| `usage_rollup.rs` | `rollup_and_prune`           | 聚合并清理旧日志         |

---

## 7. 核心功能实现

### 7.1 Provider 管理

#### 7.1.1 供应商数据结构

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/provider.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,                    // 唯一标识
    pub name: String,                  // 显示名称
    pub settings_config: Value,        // 应用特定配置
    pub website_url: Option<String>,   // 网站链接
    pub category: Option<String>,      // 分类(official/custom/aggregator等)
    pub created_at: Option<i64>,       // 创建时间戳
    pub sort_index: Option<usize>,     // 排序索引
    pub notes: Option<String>,         // 备注
    pub meta: Option<ProviderMeta>,    // 元数据(仅存储在DB)
    pub icon: Option<String>,          // 图标名称
    pub icon_color: Option<String>,    // 图标颜色
    pub in_failover_queue: bool,       // 是否在故障转移队列
}
```

#### 7.1.2 供应商切换逻辑

**关键代码路径**: `ProviderService::switch()` → `live.rs::sync_current_to_live()`

```rust
// ProviderService::switch 核心逻辑
pub fn switch(
    state: &AppState,
    app_type: AppType,
    id: &str,
) -> Result<SwitchResult, AppError> {
    // 1. 验证供应商存在
    let provider = state.db.get_provider_by_id(id, app_type.as_str())?
        .ok_or_else(|| AppError::ProviderNotFound(id.to_string()))?;

    // 2. 验证供应商设置
    Self::validate_provider_settings(&app_type, &provider)?;

    // 3. 写入 live 配置
    write_live_with_common_config(state.db.as_ref(), &app_type, &provider)?;

    // 4. 更新当前供应商标记
    state.db.set_current_provider(app_type.as_str(), id)?;
    crate::settings::set_current_provider(&app_type, Some(id))?;

    // 5. 同步 MCP 配置
    McpService::sync_all_enabled(state)?;

    Ok(SwitchResult { warnings: vec![] })
}
```

#### 7.1.3 累加模式 vs 单一模式

| 模式     | 应用                  | 特点                                |
| -------- | --------------------- | ----------------------------------- |
| 单一模式 | Claude, Codex, Gemini | 只能有一个当前供应商，切换时替换    |
| 累加模式 | OpenCode, OpenClaw    | 可同时配置多个供应商，独立启用/禁用 |

**代码判断**:

```rust
impl AppType {
    pub fn is_additive_mode(&self) -> bool {
        matches!(self, AppType::OpenCode | AppType::OpenClaw)
    }
}
```

### 7.2 MCP 服务器管理

#### 7.2.1 MCP 数据结构

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/app_config.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub server: serde_json::Value,  // 服务器配置(命令/参数/环境变量)
    pub apps: McpApps,              // 各应用启用状态
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct McpApps {
    pub claude: bool,
    pub codex: bool,
    pub gemini: bool,
    pub opencode: bool,
    pub openclaw: bool,
}
```

#### 7.2.2 MCP 同步流程

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/mcp.rs`

```
┌─────────────────────────────────────────────────────────────────┐
│                   MCP Server Management Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │   Add/Update    │                                            │
│  │   MCP Server    │                                            │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────┐                        │
│  │  1. Save to Database                │                        │
│  │     - mcp_servers table             │                        │
│  │     - JSON serialized server config │                        │
│  └────────┬────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────┐                        │
│  │  2. Sync to Enabled Apps            │                        │
│  │                                     │                        │
│  │  Claude ──▶ sync_single_server_to_claude()                   │
│  │            - ~/.claude/settings.json (mcpServers)            │
│  │                                                              │
│  │  Codex ────▶ sync_single_server_to_codex()                   │
│  │            - ~/.codex/config.toml (mcp_servers)              │
│  │                                                              │
│  │  Gemini ───▶ sync_single_server_to_gemini()                  │
│  │            - ~/.gemini/settings.json (mcpServers)            │
│  │                                                              │
│  │  OpenCode ─▶ sync_single_server_to_opencode()                │
│  │            - ~/.config/opencode/opencode.json                │
│  │                                                              │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.2.3 不同应用的 MCP 配置格式

**Claude** (`claude_mcp.rs`):

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@mcp/server"],
      "env": { "API_KEY": "xxx" }
    }
  }
}
```

**Codex** (`codex_config.rs`):

```toml
[mcp_servers.server-name]
command = "npx"
args = ["-y", "@mcp/server"]
env = { API_KEY = "xxx" }
```

**Gemini** (`gemini_mcp.rs`):

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@mcp/server"]
    }
  }
}
```

### 7.3 Skills 管理

#### 7.3.1 Skills 架构 (v3.10.0+)

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/skill.rs`

**SSOT (Single Source of Truth) 模式**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skills Management v3.10.0+                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────────────┐                                     │
│   │   SSOT Directory      │                                     │
│   │   ~/.cc-switch/skills/│                                     │
│   │   (统一管理)           │                                     │
│   └───────────┬───────────┘                                     │
│               │                                                 │
│               │  安装/更新/删除                                  │
│               │                                                 │
│               ▼                                                 │
│   ┌─────────────────────────────────────────┐                   │
│   │         Database (SQLite)               │                   │
│   │  installed_skills table                 │                   │
│   │  - id, name, description                │                   │
│   │  - directory (技能目录名)                │                   │
│   │  - repo_owner/repo_name/repo_branch     │                   │
│   │  - apps (各应用启用状态)                 │                   │
│   └─────────────────────────────────────────┘                   │
│               │                                                 │
│               │  同步到应用目录 (symlink/copy)                    │
│               ▼                                                 │
│   ┌───────────┴─────────────────────────────┐                   │
│   │      Application Directories            │                   │
│   │  ~/.claude/skills/                      │                   │
│   │  ~/.codex/skills/                       │                   │
│   │  ~/.gemini/skills/                      │                   │
│   │  ~/.config/opencode/skills/             │                   │
│   │  ~/.openclaw/skills/                    │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.3.2 Skills 安装流程

```rust
impl SkillService {
    pub async fn install(
        &self,
        db: &Arc<Database>,
        skill: &DiscoverableSkill,
        current_app: &AppType,
    ) -> Result<InstalledSkill> {
        // 1. 从GitHub下载仓库
        let (temp_dir, used_branch) = self.download_repo(&repo).await?;

        // 2. 复制到SSOT目录
        Self::copy_dir_recursive(&source, &dest)?;

        // 3. 创建InstalledSkill记录
        let installed_skill = InstalledSkill {
            id: skill.key.clone(),
            name: skill.name.clone(),
            directory: install_name.clone(),
            apps: SkillApps::only(current_app),
            // ...
        };

        // 4. 保存到数据库
        db.save_skill(&installed_skill)?;

        // 5. 同步到当前应用目录 (symlink或copy)
        Self::sync_to_app_dir(&install_name, current_app)?;

        Ok(installed_skill)
    }
}
```

### 7.4 Prompt 管理

#### 7.4.1 Prompt 数据结构

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/prompt.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub id: String,
    pub name: String,
    pub content: String,           // Markdown内容
    pub description: Option<String>,
    pub enabled: bool,             // 是否启用(每个应用只有一个启用)
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}
```

#### 7.4.2 Prompt 管理流程

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/prompt.rs`

```
┌─────────────────────────────────────────────────────────────────┐
│                   Prompt Management Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │   Enable Prompt │                                            │
│  │   (切换提示词)   │                                            │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────┐                        │
│  │  1. 回填当前Live配置                │                        │
│  │     - 读取 ~/.claude/settings.json  │                        │
│  │     - 如果存在内容，回填到之前启用的提示词│                      │
│  └────────┬────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────┐                        │
│  │  2. 禁用其他所有提示词              │                        │
│  │     - 数据库中所有prompt.enabled=false│                       │
│  └────────┬────────────────────────────┘                        │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────┐                        │
│  │  3. 启用目标提示词                  │                        │
│  │     - prompt.enabled = true         │                        │
│  │     - 写入内容到Live文件            │                        │
│  │     - write_text_file(atomic)       │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
│  ┌─────────────────┐                                            │
│  │  Import from    │                                            │
│  │  Live Config    │                                            │
│  └─────────────────┘                                            │
│  - 首次启动时自动导入                                             │
│  - 创建"Auto-imported Prompt"记录                                 │
│  - enabled = true                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.5 代理服务 (Proxy)

#### 7.5.1 代理架构

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/proxy/server.rs`

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP Proxy Server                            │
│                    (Axum + Hyper)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Request Routing                       │   │
│  │                                                          │   │
│  │  /v1/messages        ──▶  Claude API (Anthropic)         │   │
│  │  /claude/v1/messages ──▶  Claude API                     │   │
│  │                                                          │   │
│  │  /chat/completions   ──▶  Codex API (OpenAI)             │   │
│  │  /v1/chat/completions──▶  Codex API                      │   │
│  │  /responses          ──▶  Codex API (Responses)          │   │
│  │                                                          │   │
│  │  /v1beta/*           ──▶  Gemini API                     │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Provider Router                          │   │
│  │                                                          │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │  Circuit    │───▶│  Failover   │───▶│  Forwarder  │  │   │
│  │  │  Breaker    │    │  Manager    │    │             │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  │                                                          │   │
│  │  - 熔断器状态检查        - 故障转移队列管理    - 请求转发    │   │
│  │  - 健康状态追踪          - 自动切换逻辑        - 重试机制    │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.5.2 熔断器 (Circuit Breaker)

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/proxy/circuit_breaker.rs`

```rust
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    state: Arc<RwLock<CircuitState>>,
    failure_count: Arc<RwLock<u32>>,
    success_count: Arc<RwLock<u32>>,
    last_failure_time: Arc<RwLock<Option<Instant>>>,
}

pub enum CircuitState {
    Closed,      // 正常状态，请求通过
    Open,        // 熔断状态，快速失败
    HalfOpen,    // 半开状态，允许测试请求
}

pub struct CircuitBreakerConfig {
    pub failure_threshold: u32,      // 熔断失败阈值
    pub success_threshold: u32,      // 恢复成功阈值
    pub timeout_secs: u64,           // 熔断超时时间
    pub half_open_max_requests: u32, // 半开状态最大测试请求
}
```

**状态转换**:

```
        失败次数达到阈值
    ┌──────────────────────────┐
    │                          ▼
┌───┴───┐                   ┌─────────┐
│ Closed│◀──────────────────│  Open   │
│ (正常)│   超时后进入半开   │ (熔断)  │
└───┬───┘                   └────┬────┘
    │                            │
    │ 测试请求成功                │
    └────────────────────────────┘
              │
              ▼
        ┌─────────────┐
        │  HalfOpen   │
        │  (半开测试)  │
        └─────────────┘
```

#### 7.5.3 故障转移 (Failover)

**文件**: `/Users/krabswang/Personal/cc-switch/src-tauri/src/proxy/failover_switch.rs`

```rust
pub struct FailoverQueueItem {
    pub provider_id: String,
    pub provider_name: String,
    pub priority: i32,       // 优先级(越小越优先)
    pub added_at: i64,
}

// 故障转移队列管理
pub struct FailoverSwitchManager {
    db: Arc<Database>,
}
```

**故障转移流程**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   Failover Switch Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 请求到达                                                    │
│     │                                                           │
│     ▼                                                           │
│  2. 尝试P1 (队列第一个供应商)                                     │
│     │                                                           │
│     ├── 成功 ──▶ 返回响应                                        │
│     │                                                           │
│     └── 失败 ──▶ 记录失败                                         │
│                  │                                              │
│                  ▼                                              │
│  3. 尝试P2 (队列第二个供应商)                                     │
│     │                                                           │
│     ├── 成功 ──▶ 切换到P2作为当前供应商                            │
│     │           返回响应                                          │
│     │                                                           │
│     └── 失败 ──▶ 继续尝试P3...                                    │
│                                                                 │
│  4. 所有供应商失败                                               │
│     └── 返回错误                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 配置和工具链

### 8.1 前端配置

#### 8.1.1 Vite 配置 (`vite.config.ts`)

```typescript
// 关键配置项
- root: "src"                    // 源码根目录
- base: "./"                     // 相对路径基础
- build.outDir: "../dist"        // 构建输出目录
- server.port: 3000              // 开发服务器端口
- envPrefix: ["VITE_", "TAURI_"] // 环境变量前缀
- plugins:
  - @vitejs/plugin-react         // React 支持
  - code-inspector-plugin        // 开发时元素检查（仅serve模式）
- resolve.alias: { "@": "./src" } // 路径别名
```

#### 8.1.2 TypeScript 配置

**主配置 (`tsconfig.json`)**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

#### 8.1.3 TailwindCSS 配置 (`tailwind.config.cjs`)

```javascript
// 核心配置
- content: ["./src/index.html", "./src/**/*.{js,ts,jsx,tsx}"]
- darkMode: ["selector", ".dark"]  // 使用class选择器切换暗色模式
- theme.extend:
  - colors: 自定义HSL颜色系统，包含background、foreground、card等
  - boxShadow: sm、md、lg 三级阴影
  - borderRadius: sm(0.375rem)到xl(0.875rem)
  - fontFamily: 系统字体栈（-apple-system、Segoe UI等）
  - animation: fade-in、slide-up、slide-down等动画
```

### 8.2 Tauri 配置

#### 8.2.1 主配置 (`src-tauri/tauri.conf.json`)

```json
{
  "productName": "CC Switch",
  "version": "3.12.3",
  "identifier": "com.ccswitch.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "pnpm run dev:renderer",
    "beforeBuildCommand": "pnpm run build:renderer"
  },
  "app": {
    "windows": [{
      "label": "main",
      "titleBarStyle": "Overlay",
      "width": 1000,
      "height": 650,
      "minWidth": 900,
      "minHeight": 600,
      "visible": false,
      "center": true
    }],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: https: http:; ..."
    }
  },
  "bundle": {
    "targets": "all",
    "createUpdaterArtifacts": true,
    "icon": ["icons/32x32.png", "icons/128x128.png", ...],
    "macOS": { "minimumSystemVersion": "12.0" }
  },
  "plugins": {
    "deep-link": { "desktop": { "schemes": ["ccswitch"] } },
    "updater": {
      "pubkey": "...",
      "endpoints": ["https://github.com/.../latest.json"]
    }
  }
}
```

#### 8.2.2 Rust 依赖 (`src-tauri/Cargo.toml`)

**核心依赖**:

```toml
[dependencies]
tauri = { version = "2.8.2", features = ["tray-icon", "protocol-asset", "image-png"] }
serde_json = { version = "1.0", features = ["preserve_order"] }
rusqlite = { version = "0.31", features = ["bundled", "backup", "hooks"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread", "time", "sync"] }
reqwest = { version = "0.12", features = ["rustls-tls", "json", "stream", "socks"] }
axum = "0.7"  # 本地代理服务器
```

**Tauri 插件**:

- `tauri-plugin-log` - 日志记录
- `tauri-plugin-updater` - 自动更新
- `tauri-plugin-deep-link` - 深度链接
- `tauri-plugin-dialog` - 原生对话框
- `tauri-plugin-single-instance` - 单实例模式

**发布优化**:

```toml
[profile.release]
codegen-units = 1
lto = "thin"
opt-level = "s"
panic = "unwind"
strip = "symbols"
```

### 8.3 开发工具配置

#### 8.3.1 package.json Scripts

```json
{
  "scripts": {
    "dev": "pnpm tauri dev", // 启动开发模式
    "build": "pnpm tauri build", // 构建生产版本
    "dev:renderer": "vite", // 仅启动前端开发服务器
    "build:renderer": "vite build", // 仅构建前端
    "typecheck": "tsc --noEmit", // TypeScript 类型检查
    "format": "prettier --write ...", // 格式化代码
    "format:check": "prettier --check ...",
    "test:unit": "vitest run", // 运行单元测试
    "test:unit:watch": "vitest watch" // 测试监视模式
  }
}
```

#### 8.3.2 Vitest 测试配置 (`vitest.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setupGlobals.ts", "./tests/setupTests.ts"],
    globals: true,
    coverage: { reporter: ["text", "lcov"] },
  },
});
```

#### 8.3.3 测试文件结构

```
tests/
├── setupGlobals.ts          # 全局 polyfill (ResizeObserver, localStorage)
├── setupTests.ts            # 测试初始化 (i18n, MSW)
├── msw/                     # Mock Service Worker
│   ├── server.ts            # MSW 服务器配置
│   ├── handlers.ts          # API Mock 处理器
│   ├── state.ts             # Mock 状态管理
│   └── tauriMocks.ts        # Tauri API Mock
├── hooks/                   # Hook 单元测试
├── components/              # 组件测试
└── integration/             # 集成测试
```

### 8.4 CI/CD 配置

#### 8.4.1 CI 工作流 (`.github/workflows/ci.yml`)

**前端检查**:

- TypeScript 类型检查 (`pnpm typecheck`)
- Prettier 格式检查 (`pnpm format:check`)
- 单元测试 (`pnpm test:unit`)

**后端检查**:

- Rust 格式检查 (`cargo fmt --check`)
- Clippy 静态分析 (`cargo clippy -- -D warnings`)
- Rust 单元测试 (`cargo test`)

**环境要求**:

- Node.js 20
- pnpm 10.12.3
- Rust stable
- Linux 系统依赖 (GTK, WebKit2GTK, libsoup)

#### 8.4.2 发布工作流 (`.github/workflows/release.yml`)

**构建矩阵**:

- Windows 2022 (MSI + Portable ZIP)
- Ubuntu 22.04 x86_64 (AppImage + DEB + RPM)
- Ubuntu 22.04 ARM64
- macOS 14 Universal (DMG + ZIP)

**签名与公证**:

- Windows: Tauri 签名密钥
- macOS: Apple Developer ID 签名 + Notary 公证

**发布产物**:

```
CC-Switch-v{version}-macOS.dmg
CC-Switch-v{version}-macOS.zip
CC-Switch-v{version}-Windows.msi
CC-Switch-v{version}-Windows-Portable.zip
CC-Switch-v{version}-Linux-x86_64.AppImage
CC-Switch-v{version}-Linux-x86_64.deb
CC-Switch-v{version}-Linux-x86_64.rpm
CC-Switch-v{version}-Linux-arm64.AppImage
...
```

### 8.5 环境要求

#### 8.5.1 开发环境

**必需**:

- Node.js 22.12.0 (根据 `.node-version`)
- pnpm 10.12.3+
- Rust 1.85.0+
- Tauri CLI 2.8.0

**平台特定依赖**:

**macOS**:

- Xcode Command Line Tools
- Apple Developer 账号（用于签名）

**Windows**:

- Microsoft Visual C++ Build Tools
- Windows SDK

**Linux**:

```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev

# 其他依赖
build-essential pkg-config libssl-dev librsvg2-dev libsoup-3.0-dev
```

#### 8.5.2 构建流程

```bash
# 1. 安装依赖
pnpm install

# 2. 开发模式
pnpm dev              # 启动 Tauri 开发模式

# 3. 代码检查
pnpm typecheck        # TypeScript 检查
pnpm format:check     # 格式检查
pnpm test:unit        # 运行测试

# 4. 生产构建
pnpm build            # 构建完整应用

# 5. 仅构建前端
pnpm build:renderer
```

---

## 9. 项目重写注意事项

### 9.1 核心架构决策（必须保留）

1. **Single Source of Truth (SSOT)**
   - 所有配置存储在 SQLite 数据库
   - Live 配置文件为实时视图
   - 回填机制确保数据一致性

2. **分层架构**
   - Frontend → Tauri IPC → Commands → Services → DAO → Database
   - 清晰的职责分离

3. **累加模式 vs 单一模式**
   - Claude/Codex/Gemini 使用单一模式
   - OpenCode/OpenClaw 使用累加模式

4. **跨应用同步**
   - MCP 统一存储，独立启用标记
   - Skills SSOT + 符号链接同步

5. **代理服务**
   - 熔断器机制
   - 故障转移队列
   - 用量统计和日聚合

### 9.2 技术选型建议

**保持不变**:

- Tauri 2.x + React 18 + TypeScript
- SQLite (rusqlite)
- TanStack Query
- shadcn/ui
- TailwindCSS

**可考虑升级**:

- React 19 (如果稳定)
- TailwindCSS 4 (如果使用新特性)

### 9.3 数据迁移策略

**从旧版本迁移**:

1. JSON → SQLite 自动迁移
2. Schema 版本控制
3. 备份机制

### 9.4 测试策略

**必须保留**:

- 单元测试覆盖关键 hooks
- 集成测试覆盖主要流程
- MSW 模拟 Tauri API

### 9.5 配置文件清单

| 配置文件                        | 用途            | 重写时是否需要 |
| ------------------------------- | --------------- | -------------- |
| `package.json`                  | npm 配置        | 是             |
| `vite.config.ts`                | Vite 配置       | 是             |
| `tsconfig.json`                 | TypeScript 配置 | 是             |
| `tailwind.config.cjs`           | Tailwind 配置   | 是             |
| `vitest.config.ts`              | 测试配置        | 是             |
| `src-tauri/tauri.conf.json`     | Tauri 配置      | 是             |
| `src-tauri/Cargo.toml`          | Rust 依赖       | 是             |
| `.github/workflows/ci.yml`      | CI 配置         | 是             |
| `.github/workflows/release.yml` | 发布配置        | 是             |

### 9.6 关键文件路径

| 功能模块         | 文件路径                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| **Provider模型** | `/Users/krabswang/Personal/cc-switch/src-tauri/src/provider.rs`              |
| **Provider服务** | `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/provider/mod.rs` |
| **Provider命令** | `/Users/krabswang/Personal/cc-switch/src-tauri/src/commands/provider.rs`     |
| **MCP服务**      | `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/mcp.rs`          |
| **MCP模块**      | `/Users/krabswang/Personal/cc-switch/src-tauri/src/mcp/mod.rs`               |
| **Skills服务**   | `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/skill.rs`        |
| **Prompt服务**   | `/Users/krabswang/Personal/cc-switch/src-tauri/src/services/prompt.rs`       |
| **Proxy服务器**  | `/Users/krabswang/Personal/cc-switch/src-tauri/src/proxy/server.rs`          |
| **Proxy处理器**  | `/Users/krabswang/Personal/cc-switch/src-tauri/src/proxy/handlers.rs`        |
| **熔断器**       | `/Users/krabswang/Personal/cc-switch/src-tauri/src/proxy/circuit_breaker.rs` |
| **数据库**       | `/Users/krabswang/Personal/cc-switch/src-tauri/src/database/mod.rs`          |
| **托盘**         | `/Users/krabswang/Personal/cc-switch/src-tauri/src/tray.rs`                  |
| **前端Hook**     | `/Users/krabswang/Personal/cc-switch/src/hooks/useProviderActions.ts`        |
| **应用入口**     | `/Users/krabswang/Personal/cc-switch/src-tauri/src/lib.rs`                   |

---

**文档完成日期**: 2026-04-08  
**项目版本**: 3.12.3  
**文档用途**: 项目重写基准文档
