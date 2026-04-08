# CC Switch Electron 重写开发计划

> **项目类型**: 完全重写 (from Tauri to Electron)  
> **目标版本**: v4.0.0  
> **开发周期**: 预估 16-20 周  
> **文档创建日期**: 2026-04-08

---

## 1. 项目概述

### 1.1 项目目标

使用 **Electron + React + TypeScript** 技术栈完全重写 CC Switch，保留所有核心功能，但采用全新的 UI/UX 设计。

**核心要求**:

- ✅ UI 完全不参考当前版本
- ✅ 使用 shadcn/ui 作为唯一 UI 组件库
- ✅ 所有图标使用 Lucide
- ✅ 页面结构清晰，用户动线简化
- ✅ 充分规避原项目中的架构问题
- ✅ 保持与原版本的数据兼容性

### 1.2 技术栈选型

#### 前端技术栈

| 技术            | 版本     | 用途       | 选择理由                       |
| --------------- | -------- | ---------- | ------------------------------ |
| Electron        | ^30.0.0  | 桌面框架   | 成熟的跨平台方案，生态丰富     |
| React           | ^18.3.0  | UI 框架    | 声明式 UI，生态完善            |
| TypeScript      | ^5.4.0   | 类型系统   | 类型安全，IDE 友好             |
| Vite            | ^5.0.0   | 构建工具   | 快速 HMR，现代化工具链         |
| TailwindCSS     | ^3.4.0   | 样式系统   | 原子化 CSS，与 shadcn 完美集成 |
| shadcn/ui       | latest   | UI 组件库  | 高质量组件，完全可控           |
| Lucide React    | ^0.400.0 | 图标库     | 用户指定，风格统一             |
| TanStack Query  | ^5.35.0  | 服务端状态 | 强大的数据同步能力             |
| Zustand         | ^4.5.0   | 客户端状态 | 轻量，TypeScript 友好          |
| React Hook Form | ^7.51.0  | 表单处理   | 性能优秀，验证集成             |
| Zod             | ^3.23.0  | 数据验证   | 类型安全，运行时验证           |
| React Router    | ^6.23.0  | 路由管理   | 声明式路由，懒加载支持         |
| i18next         | ^23.11.0 | 国际化     | 成熟方案，资源预加载           |

#### 后端技术栈 (主进程)

| 技术           | 版本    | 用途        | 选择理由              |
| -------------- | ------- | ----------- | --------------------- |
| Node.js        | ^20.0.0 | 运行时      | LTS 版本，长期支持    |
| better-sqlite3 | ^9.6.0  | 数据库      | 同步 SQLite，性能优异 |
| Express.js     | ^4.19.0 | HTTP 代理   | 轻量，中间件丰富      |
| node-fetch     | ^3.3.0  | HTTP 客户端 | 现代 fetch API        |
| electron-log   | ^5.1.0  | 日志记录    | 自动日志轮转          |
| electron-store | ^8.2.0  | 配置存储    | 加密支持，类型安全    |
| keytar         | ^7.9.0  | 密钥存储    | 系统密钥库集成        |

#### 开发工具

| 工具              | 用途     |
| ----------------- | -------- |
| ESLint + Prettier | 代码规范 |
| Vitest            | 单元测试 |
| Playwright        | E2E 测试 |
| electron-builder  | 应用打包 |
| electron-updater  | 自动更新 |

### 1.3 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Database   │  │   Services   │  │     HTTP Proxy Server    │  │
│  │  (SQLite)    │  │  (Business)  │  │    (Express + Express)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                       │                 │
│         └─────────────────┼───────────────────────┘                 │
│                           │                                         │
│  ┌────────────────────────┴────────────────────────┐                │
│  │              IPC Handlers (Channels)            │                │
│  │   providers:* │ mcp:* │ skills:* │ prompts:*    │                │
│  └─────────────────────────────────────────────────┘                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ IPC Communication
┌───────────────────────────┴─────────────────────────────────────────┐
│                      Electron Renderer Process                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      React Application                       │   │
│  │                                                              │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │   │  Router  │  │  Layout  │  │  Pages   │  │  Shared  │    │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │                                                              │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │   │  Zustand │  │TanStack  │  │   shadcn │  │  Lucide  │    │   │
│  │   │ (Client) │  │  Query   │  │   /ui    │  │  Icons   │    │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 数据流设计

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User UI   │────▶│   Zustand   │────▶│ TanStack    │────▶│  Electron   │
│  (React)    │     │  (Client)   │     │   Query     │     │    IPC      │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
     ▲                                                              │
     │                                                              ▼
     │                                                       ┌─────────────┐
     │                                                       │   Main      │
     │                                                       │  Process    │
     │                                                       └──────┬──────┘
     │                                                              │
     │     ┌─────────────┐     ┌─────────────┐     ┌──────────────┴──────┐
     └─────│   UI Re-    │◀────│  Query      │◀────│   Services Layer    │
           │   render    │     │  Cache      │     │  (Database + File)  │
           └─────────────┘     └─────────────┘     └─────────────────────┘
```

---

## 2. 开发阶段规划

### Phase 0: 项目初始化 (Week 1)

**目标**: 搭建基础架构，建立开发环境

**关键任务**:

1. 初始化 Electron + Vite + React 项目
2. 配置 TypeScript 严格模式
3. 集成 shadcn/ui 和 TailwindCSS
4. 配置 ESLint + Prettier
5. 设置 Vitest 测试环境
6. 配置 electron-builder
7. 建立 Git 工作流

**交付物**:

- 可运行的空 Electron 应用
- 开发/构建脚本
- 基础 UI 组件展示
- 文档模板

### Phase 1: 核心基础设施 (Week 2-3)

**目标**: 建立数据层和 IPC 通信基础

**关键任务**:

1. 设计数据库 Schema (复刻原版本)
2. 实现 better-sqlite3 封装
3. 建立 IPC 通信协议
4. 实现错误处理体系
5. 配置日志系统
6. 实现配置持久化 (electron-store)
7. 集成系统密钥库 (keytar)

**技术要点**:

- 规避原项目单连接问题，使用连接池
- 规避 unwrap/expect，使用 Result 类型
- 统一的错误码体系

**交付物**:

- 数据库连接和迁移系统
- 基础 IPC 通信
- 配置读写 API
- 错误处理中间件

### Phase 2: Provider 管理 (Week 4-6)

**目标**: 实现供应商管理核心功能

**关键任务**:

1. 设计新的 Provider 数据结构
2. 实现 Provider CRUD 服务
3. 设计 Provider 配置预设系统
4. 实现供应商切换逻辑
5. 实现配置文件写入适配器
6. 设计 Provider 列表 UI
7. 实现添加/编辑表单
8. 实现拖拽排序

**UI/UX 设计要点**:

- 使用 Card 组件展示供应商
- 清晰的视觉层次
- 批量操作支持
- 快速切换按钮

**规避原项目问题**:

- ProviderService 拆分为多个小服务
- 表单按应用类型拆分
- 统一的配置适配器抽象

**交付物**:

- Provider 管理完整功能
- 配置文件同步
- 预设供应商库

### Phase 3: MCP 服务器管理 (Week 7-8)

**目标**: 实现 MCP 服务器统一管理

**关键任务**:

1. 设计 MCP 数据结构
2. 实现 MCP CRUD 服务
3. 实现跨应用同步逻辑
4. 设计 MCP 列表 UI
5. 实现添加/编辑表单
6. 实现预设导入
7. 实现应用启用状态控制

**UI/UX 设计要点**:

- 统一的 MCP 列表
- 按应用分组显示
- 批量启用/禁用
- 快速添加预设

**规避原项目问题**:

- 统一的 MCP 适配器接口
- 避免代码重复

**交付物**:

- MCP 管理完整功能
- 跨应用同步
- 预设库

### Phase 4: Skills 管理 (Week 9-10)

**目标**: 实现 Skills 发现和安装

**关键任务**:

1. 设计 Skills 数据结构
2. 实现 GitHub 仓库扫描
3. 实现 Skills 安装/卸载
4. 实现 SSOT 管理
5. 实现 Skills 列表 UI
6. 实现发现页面
7. 实现仓库管理

**UI/UX 设计要点**:

- 网格布局展示 Skills
- 清晰的安装状态
- 搜索和筛选
- 批量操作

**交付物**:

- Skills 发现
- 安装/卸载
- 应用同步

### Phase 5: Prompt 管理 (Week 11)

**目标**: 实现系统提示词管理

**关键任务**:

1. 设计 Prompt 数据结构
2. 实现 Prompt CRUD
3. 集成 Markdown 编辑器
4. 实现实时预览
5. 设计 Prompt 列表 UI
6. 实现编辑表单
7. 实现配置回填

**UI/UX 设计要点**:

- 分屏编辑器
- 实时预览
- 简洁的列表视图
- 快速启用/禁用

**交付物**:

- Prompt 管理
- Markdown 编辑
- 配置回填

### Phase 6: 代理服务 (Week 12-13)

**目标**: 实现 HTTP 代理服务器

**关键任务**:

1. 设计代理服务器架构
2. 实现 Express 代理服务器
3. 实现请求路由
4. 实现熔断器
5. 实现故障转移
6. 实现用量统计
7. 实现用量图表 UI
8. 实现代理控制面板

**UI/UX 设计要点**:

- 清晰的代理状态指示
- 实时用量图表
- 熔断状态可视化
- 故障转移队列

**规避原项目问题**:

- 使用中间件模式
- 分离路由、转换、熔断逻辑
- 避免巨型服务类

**交付物**:

- 代理服务器
- 熔断器
- 用量统计
- 控制面板

### Phase 7: 系统集成 (Week 14)

**目标**: 实现系统托盘和自动启动

**关键任务**:

1. 实现系统托盘
2. 实现托盘菜单
3. 实现轻量模式
4. 实现自动启动
5. 实现深链接
6. 实现更新检查
7. 实现导入/导出
8. 实现 WebDAV 同步

**UI/UX 设计要点**:

- 简洁的托盘菜单
- 快速切换供应商
- 应用分组

**交付物**:

- 系统托盘
- 自动启动
- 深链接
- 数据同步

### Phase 8: 国际化和优化 (Week 15)

**目标**: 实现多语言和性能优化

**关键任务**:

1. 实现 i18n 框架
2. 翻译所有文案
3. 性能优化
4. 内存优化
5. 启动时间优化
6. 添加性能监控
7. 完善错误处理
8. 添加帮助文档

**交付物**:

- 多语言支持
- 性能优化
- 完整文档

### Phase 9: 测试和发布 (Week 16-17)

**目标**: 全面测试和发布准备

**关键任务**:

1. 编写单元测试
2. 编写集成测试
3. 编写 E2E 测试
4. 手动测试所有功能
5. 修复 Bug
6. 配置自动更新
7. 准备发布材料
8. 构建发布版本

**交付物**:

- 测试套件
- 发布版本
- 用户文档

---

## 3. UI/UX 设计原则

### 3.1 设计哲学

**核心原则**: **简洁、清晰、高效**

#### 设计目标

1. **减少认知负担** - 每个界面只做一件事
2. **最小化操作步骤** - 核心操作不超过 3 步
3. **一致性** - 统一的视觉语言和交互模式
4. **反馈及时** - 操作后立即反馈状态

### 3.2 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  App Bar (标题 + 全局操作)                                   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Navigation  │              Main Content                    │
│              │                                              │
│  - Dashboard │          ┌──────────────────────┐           │
│  - Providers │          │    Page Header       │           │
│  - MCP       │          │    (标题 + 操作)     │           │
│  - Skills    │          └──────────────────────┘           │
│  - Prompts   │                                              │
│  - Proxy     │          ┌──────────────────────┐           │
│  - Settings  │          │    Content Area      │           │
│              │          │                      │           │
│              │          └──────────────────────┘           │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 3.3 导航设计

**左侧导航栏**:

```
🏠 Dashboard      (总览、快捷操作)
🔌 Providers      (供应商管理)
🧩 MCP Servers    (MCP 服务器)
🎨 Skills         (技能管理)
📝 Prompts        (系统提示词)
🌐 Proxy          (代理服务)
⚙️  Settings       (设置)
```

**设计要点**:

- 使用 Lucide Icons
- 当前页面高亮
- 可折叠
- 支持快捷键

### 3.4 供应商管理页面

```
┌─────────────────────────────────────────────────────────────┐
│  Providers                              [+ Add Provider]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [All] [Claude] [Codex] [Gemini] [OpenCode] [OpenClaw]      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 Anthropic Claude                    [Active ✓]   │   │
│  │    Official Provider                                 │   │
│  │    claude-3-opus-4-20250514                          │   │
│  │                                         [Edit] [⋮]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚫ DeepSeek                            [Switch →]   │   │
│  │    CN Official                                       │   │
│  │    deepseek-chat                                     │   │
│  │                                         [Edit] [⋮]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**设计要点**:

- 卡片式布局
- 清晰的状态标识
- 快速切换按钮
- 按应用过滤
- 拖拽排序

### 3.5 表单设计

**添加供应商弹窗**:

```
┌──────────────────────────────────────────┐
│  Add Provider                     [×]    │
├──────────────────────────────────────────┤
│                                          │
│  Step 1: Select Provider Type            │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ 🎯 Preset    │ │ ✏️  Custom    │      │
│  └──────────────┘ └──────────────┘      │
│                                          │
│  [Search presets...]                     │
│                                          │
│  ○ Claude Official      (Anthropic)      │
│  ○ DeepSeek            (CN Official)     │
│  ○ OpenRouter          (Aggregator)      │
│                                          │
│                    [Cancel]  [Continue →]│
└──────────────────────────────────────────┘
```

**设计要点**:

- 分步表单
- 预设选择简化配置
- 实时验证
- 清晰的导航

### 3.6 颜色系统

使用 shadcn/ui 默认的颜色系统:

```css
/* Primary - 品牌色 */
--primary: 222 47% 31%;
--primary-foreground: 210 40% 98%;

/* 状态色 */
--success: 142 76% 36%;
--warning: 38 92% 50%;
--destructive: 0 84% 60%;
--info: 221 83% 53%;

/* 中性色 */
--background: 0 0% 100%;
--foreground: 222 47% 11%;
--muted: 210 40% 96%;
--border: 214 32% 91%;
```

### 3.7 动效设计

**原则**: 有目的性的动效，提升体验而非干扰

| 场景       | 动效         | 时长      |
| ---------- | ------------ | --------- |
| 页面切换   | Fade + Slide | 200ms     |
| 列表项出现 | Stagger fade | 50ms each |
| 按钮悬停   | Scale 1.02   | 150ms     |
| 弹窗出现   | Scale + Fade | 200ms     |
| 加载状态   | Pulse        | 1.5s      |

---

## 4. 详细任务列表

### Task 1: 项目初始化

**Files:**

- Create: `package.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `vite.main.config.ts`
- Create: `vite.renderer.config.ts`
- Create: `tsconfig.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc`

**Steps:**

1. **初始化项目结构**

```bash
mkdir cc-switch-electron
cd cc-switch-electron
npm init -y
```

2. **安装核心依赖**

```bash
npm install electron@^30.0.0
npm install react@^18.3.0 react-dom@^18.3.0
npm install -D typescript@^5.4.0 vite@^5.0.0 @vitejs/plugin-react
```

3. **配置 Electron 主进程**

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

4. **配置 Preload 脚本**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

export interface IElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
}

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => callback(...args)),
});
```

### Task 2: 集成 shadcn/ui

**Files:**

- Create: `components.json`
- Create: `tailwind.config.js`
- Create: `src/index.css`
- Create: `src/lib/utils.ts`

**Steps:**

1. **初始化 shadcn**

```bash
npx shadcn-ui@latest init --yes --template vite --base-color slate
```

2. **安装核心组件**

```bash
npx shadcn add button card dialog input label select tabs
npx shadcn add dropdown-menu tooltip badge avatar separator
npx shadcn add scroll-area skeleton toast sonner
```

3. **配置 Tailwind**

```javascript
// tailwind.config.js
import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // shadcn 默认配置
    },
  },
  plugins: [tailwindcssAnimate],
};
```

### Task 3: 数据库层实现

**Files:**

- Create: `electron/database/index.ts`
- Create: `electron/database/schema.ts`
- Create: `electron/database/migrations.ts`

**Steps:**

1. **安装依赖**

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

2. **实现数据库连接**

```typescript
// electron/database/index.ts
import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";

const dbPath = path.join(app.getPath("userData"), "cc-switch.db");

class DatabaseManager {
  private db: Database.Database;

  constructor() {
    this.db = new Database(dbPath);
    this.initializeSchema();
    this.runMigrations();
  }

  private initializeSchema() {
    // 创建表结构
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        app_type TEXT NOT NULL,
        name TEXT NOT NULL,
        settings_config TEXT NOT NULL,
        website_url TEXT,
        category TEXT,
        created_at INTEGER,
        sort_index INTEGER DEFAULT 0,
        is_current BOOLEAN DEFAULT 0,
        in_failover_queue BOOLEAN DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        server_config TEXT NOT NULL,
        description TEXT,
        enabled_claude BOOLEAN DEFAULT 0,
        enabled_codex BOOLEAN DEFAULT 0,
        enabled_gemini BOOLEAN DEFAULT 0,
        enabled_opencode BOOLEAN DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_providers_app ON providers(app_type, sort_index);
    `);
  }

  getDb() {
    return this.db;
  }
}

export const dbManager = new DatabaseManager();
```

### Task 4: Provider 服务实现

**Files:**

- Create: `electron/services/provider/types.ts`
- Create: `electron/services/provider/crud.ts`
- Create: `electron/services/provider/switch.ts`
- Create: `electron/services/provider/config-adapter.ts`

**Steps:**

1. **定义类型**

```typescript
// electron/services/provider/types.ts
export interface Provider {
  id: string;
  appType: AppType;
  name: string;
  settingsConfig: Record<string, any>;
  websiteUrl?: string;
  category?: ProviderCategory;
  createdAt?: number;
  sortIndex: number;
  isCurrent: boolean;
  inFailoverQueue: boolean;
}

export type AppType = "claude" | "codex" | "gemini" | "opencode" | "openclaw";

export type ProviderCategory =
  | "official"
  | "cn_official"
  | "aggregator"
  | "third_party"
  | "cloud_provider"
  | "custom";
```

2. **实现 CRUD 服务** (小服务，避免巨型文件)

```typescript
// electron/services/provider/crud.ts
import { dbManager } from "../../database";
import { Provider, AppType } from "./types";

export class ProviderCrudService {
  private db = dbManager.getDb();

  getAll(appType: AppType): Provider[] {
    const stmt = this.db.prepare(`
      SELECT * FROM providers 
      WHERE app_type = ? 
      ORDER BY sort_index ASC, created_at DESC
    `);
    return stmt.all(appType).map(this.mapRowToProvider);
  }

  getById(id: string, appType: AppType): Provider | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM providers 
      WHERE id = ? AND app_type = ?
    `);
    const row = stmt.get(id, appType);
    return row ? this.mapRowToProvider(row) : undefined;
  }

  create(provider: Omit<Provider, "id" | "createdAt">): Provider {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO providers 
      (id, app_type, name, settings_config, website_url, category, created_at, sort_index, is_current, in_failover_queue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      provider.appType,
      provider.name,
      JSON.stringify(provider.settingsConfig),
      provider.websiteUrl,
      provider.category,
      createdAt,
      provider.sortIndex,
      provider.isCurrent ? 1 : 0,
      provider.inFailoverQueue ? 1 : 0,
    );

    return { ...provider, id, createdAt };
  }

  private mapRowToProvider(row: any): Provider {
    return {
      id: row.id,
      appType: row.app_type,
      name: row.name,
      settingsConfig: JSON.parse(row.settings_config),
      websiteUrl: row.website_url,
      category: row.category,
      createdAt: row.created_at,
      sortIndex: row.sort_index,
      isCurrent: row.is_current === 1,
      inFailoverQueue: row.in_failover_queue === 1,
    };
  }
}

export const providerCrud = new ProviderCrudService();
```

### Task 5: 前端 Provider 页面

**Files:**

- Create: `src/pages/Providers/index.tsx`
- Create: `src/pages/Providers/ProviderCard.tsx`
- Create: `src/pages/Providers/AddProviderDialog.tsx`
- Create: `src/hooks/useProviders.ts`

**Steps:**

1. **实现 API 封装**

```typescript
// src/api/providers.ts
import { window } from "@electron/remote";

export const providersApi = {
  getAll: (appType: AppType) =>
    window.electronAPI.invoke("providers:getAll", appType),

  create: (provider: CreateProviderInput) =>
    window.electronAPI.invoke("providers:create", provider),

  update: (id: string, provider: UpdateProviderInput) =>
    window.electronAPI.invoke("providers:update", id, provider),

  delete: (id: string, appType: AppType) =>
    window.electronAPI.invoke("providers:delete", id, appType),

  switch: (id: string, appType: AppType) =>
    window.electronAPI.invoke("providers:switch", id, appType),
};
```

2. **实现 Provider 卡片组件**

```typescript
// src/pages/Providers/ProviderCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Settings, MoreVertical } from 'lucide-react';
import { Provider } from '@/types';

interface ProviderCardProps {
  provider: Provider;
  onSwitch: () => void;
  onEdit: () => void;
}

export function ProviderCard({ provider, onSwitch, onEdit }: ProviderCardProps) {
  return (
    <Card className={provider.isCurrent ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            {provider.isCurrent && (
              <Badge variant="default">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <Badge variant="secondary">{provider.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {provider.settingsConfig.model || 'No model configured'}
          </p>
          <div className="flex gap-2">
            <Button
              variant={provider.isCurrent ? 'secondary' : 'default'}
              size="sm"
              onClick={onSwitch}
              disabled={provider.isCurrent}
            >
              {provider.isCurrent ? 'Active' : 'Switch'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Task 6: 代理服务实现

**Files:**

- Create: `electron/services/proxy/server.ts`
- Create: `electron/services/proxy/circuit-breaker.ts`
- Create: `electron/services/proxy/router.ts`
- Create: `electron/services/proxy/usage-logger.ts`

**步骤要点**:

- 使用 Express 中间件模式
- 分离路由、熔断、转发逻辑
- 每个功能独立文件，避免巨型服务

### Task 7: 系统托盘

**Files:**

- Create: `electron/services/tray/index.ts`
- Create: `electron/services/tray/menu.ts`

**步骤要点**:

- 独立的托盘服务
- 动态菜单生成
- 轻量模式支持

---

## 5. 风险规避策略

### 5.1 规避原项目架构问题

| 原项目问题         | 规避策略        | 实施方式                           |
| ------------------ | --------------- | ---------------------------------- |
| 巨型文件           | 单一职责原则    | 每个服务/组件不超过 300 行         |
| unwrap/expect 过多 | Result 类型传播 | 强制使用 try/catch 和 Result       |
| 类型定义分散       | 共享类型定义    | 统一 types 目录，前后端共享        |
| 数据库单连接       | 连接池          | 使用 better-sqlite3 的连接池       |
| 循环依赖           | 依赖注入        | 使用 IoC 容器管理依赖              |
| 配置适配器重复     | 统一抽象        | 定义 ConfigAdapter 接口            |
| 前端状态混乱       | 分层管理        | Zustand(客户端) + TanStack(服务端) |

### 5.2 技术风险应对

| 风险              | 可能性 | 影响 | 应对策略                      |
| ----------------- | ------ | ---- | ----------------------------- |
| Electron 性能问题 | 中     | 高   | 主进程隔离，使用 Web Workers  |
| SQLite 并发瓶颈   | 低     | 中   | 使用 WAL 模式，批量操作       |
| IPC 通信复杂      | 中     | 中   | 定义清晰的 IPC 协议，类型安全 |
| 打包体积过大      | 高     | 中   | Tree shaking, 按需加载        |
| 跨平台兼容        | 中     | 高   | CI/CD 多平台测试              |

### 5.3 开发风险应对

1. **进度风险**
   - 每周检查点会议
   - 功能优先级排序
   - MVP 优先，高级功能延后

2. **质量风险**
   - TDD 开发模式
   - 代码审查强制
   - 自动化测试覆盖

3. **兼容性风险**
   - 与原版本数据格式兼容
   - 迁移脚本编写
   - 回滚策略准备

---

## 6. 开发规范

### 6.1 代码规范

**TypeScript 严格模式**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**文件大小限制**:

- 单个文件不超过 300 行
- 函数不超过 50 行
- 组件不超过 200 行

**命名规范**:

- 组件: PascalCase
- Hooks: camelCase (useXxx)
- 服务: camelCase (xxxService)
- 常量: UPPER_SNAKE_CASE
- 类型: PascalCase (Type 后缀)

### 6.2 Git 工作流

**分支策略**:

```
main (production)
  ↑
develop (integration)
  ↑
feature/* (features)
  ↑
hotfix/* (urgent fixes)
```

**提交规范**:

```
feat: 新功能
fix: 修复
refactor: 重构
docs: 文档
test: 测试
chore: 构建/工具
```

### 6.3 测试策略

**测试金字塔**:

- 单元测试: 70% (Vitest)
- 集成测试: 20% (Vitest)
- E2E 测试: 10% (Playwright)

**覆盖率目标**:

- 核心业务逻辑: >90%
- UI 组件: >70%
- 整体: >80%

---

## 7. 里程碑检查点

### Milestone 1: 基础设施 (Week 2)

- [ ] Electron + React 运行
- [ ] shadcn/ui 集成
- [ ] 数据库连接
- [ ] 基础 IPC 通信

### Milestone 2: Provider 管理 (Week 6)

- [ ] Provider CRUD
- [ ] 配置文件同步
- [ ] UI 完成
- [ ] 测试覆盖 >80%

### Milestone 3: 核心功能 (Week 10)

- [ ] MCP 管理
- [ ] Skills 管理
- [ ] Prompt 管理
- [ ] 功能集成测试

### Milestone 4: 代理服务 (Week 13)

- [ ] HTTP 代理
- [ ] 熔断器
- [ ] 用量统计
- [ ] 性能测试通过

### Milestone 5: 发布准备 (Week 16)

- [ ] 所有功能完成
- [ ] 测试通过
- [ ] 文档完整
- [ ] 打包成功

---

## 8. 附录

### 8.1 参考资源

- [Electron Documentation](https://www.electronjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Lucide Icons](https://lucide.dev/icons/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)

### 8.2 性能基准

**目标性能指标**:

- 启动时间: < 3s
- 内存占用: < 300MB
- 响应延迟: < 100ms
- 打包体积: < 150MB

### 8.3 兼容性要求

**支持平台**:

- macOS 12+
- Windows 10+
- Ubuntu 20.04+

**Node.js 版本**:

- 开发: 20.x LTS
- 最低: 18.x

---

**计划创建日期**: 2026-04-08  
**最后更新**: 2026-04-08  
**计划版本**: v1.0.0  
**状态**: 待执行
