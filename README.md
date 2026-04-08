# CC Switch Electron

All-in-One AI CLI configuration manager - Electron Edition v4.0.0

## Project Status

✅ **Phase 0: 项目初始化** - 已完成
✅ **Phase 1: 核心基础设施** - 已完成

### Phase 0: 项目初始化

1. **项目结构搭建**
   - Electron + Vite + React + TypeScript 集成
   - TailwindCSS + shadcn/ui 配置
   - 严格 TypeScript 模式启用
   - ESLint + Prettier 代码规范配置

2. **构建系统**
   - Vite 构建配置（渲染进程 + 主进程 + preload）
   - electron-builder 打包配置
   - 支持 macOS/Windows/Linux 多平台构建

3. **应用架构**
   - React Router 路由系统
   - TanStack Query 服务端状态管理
   - 基础页面框架（Sidebar + Layout）
   - IPC 通信基础设置

### Phase 1: 核心基础设施 ✅

1. **数据库层** (`electron/database/`)
   - better-sqlite3 集成
   - 完整 Schema 设计 (providers, mcp_servers, prompts, skills, settings)
   - 自动迁移系统
   - WAL 模式支持
   - 数据库统计和备份

2. **IPC 通信** (`electron/ipc/`)
   - 类型安全的 IPC 注册表
   - 统一响应格式 (ApiResponse)
   - 错误包装和序列化
   - Provider handlers 实现

3. **错误处理** (`electron/utils/errors.ts`)
   - 标准化错误代码 (ErrorCode)
   - CCError 自定义错误类
   - Result<T, E> 类型
   - IPC 错误包装器

4. **配置持久化** (`electron/utils/config-store.ts`)
   - electron-store 集成
   - 类型安全设置管理
   - 窗口状态保存/恢复
   - 导入/导出功能

5. **日志系统** (electron-log)
   - 主进程日志初始化
   - 自动日志轮转
   - 错误追踪

6. **共享类型** (`src/types/index.ts`)
   - 前后端共享类型定义
   - Provider/MCP/Prompt/Skill 类型
   - IPC 通道类型
   - 设置默认值

### Phase 2: Provider 管理 ✅

1. **前端 API 层** (`src/lib/api/`)
   - 完整的 IPC 调用封装
   - 类型安全的 API 方法
   - Provider/MCP/Prompt/Skill/Settings API

2. **TanStack Query Hooks** (`src/hooks/`)
   - `useProviders` - 获取所有 providers
   - `useCreateProvider` - 创建 provider
   - `useUpdateProvider` - 更新 provider
   - `useDeleteProvider` - 删除 provider
   - `useSwitchProvider` - 切换 provider

3. **UI 组件** (`src/components/`)
   - `ProviderCard` - Provider 卡片展示
   - `AddProviderDialog` - 添加 Provider 对话框
   - `EditProviderDialog` - 编辑 Provider 对话框
   - 基础 UI 组件 (Button, Card, Badge, Input, Label, Select)

4. **Provider 页面** (`src/pages/Providers/`)
   - Provider 列表视图
   - 应用选择器 (Claude/Codex/Gemini/OpenCode/OpenClaw)
   - CRUD 操作完整支持
   - 预设供应商选择

5. **预设配置** (`src/config/providerPresets.ts`)
   - 8 个预设供应商配置
   - Claude Official, OpenAI, Gemini
   - DeepSeek (CN Official)
   - OpenRouter, SiliconFlow (Aggregator)
   - Azure OpenAI, AWS Bedrock (Cloud Provider)

### Phase 3-9: 后续功能...

## 可用脚本

```bash
# 开发模式
npm run dev

# 构建项目
npm run build

# 类型检查
npm run typecheck

# 代码格式化
npm run format
npm run lint

# 测试
npm run test
```

## 技术栈

- **Electron**: ^30.0.0
- **React**: ^18.3.0
- **TypeScript**: ^5.4.0
- **Vite**: ^5.0.0
- **TailwindCSS**: ^3.4.0
- **TanStack Query**: ^5.35.0
- **React Router**: ^6.23.0
- **better-sqlite3**: ^9.6.0
- **electron-store**: ^8.2.0

## 架构设计

遵循 ELECTRON_REWRITE_PLAN.md 中的规划，规避原项目的架构问题：

- ✅ 单文件限制 (<300 行)
- ✅ 单一职责原则
- ✅ 类型安全 (严格 TypeScript)
- ✅ 分层架构 (Services/DAO/Components)

## 许可证

MIT
