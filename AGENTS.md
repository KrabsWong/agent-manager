# AGENTS.md

## 架构概览

Yes Sessions - AI CLI 会话管理器桌面应用。

**双进程架构**:
- Frontend: React + Vite (`src/`)
- Backend: Rust HTTP server (`rust-service/`)，端口 3000
- Desktop wrapper: Neutralinojs

**关键入口点**:
- `src/main.tsx` - 主应用
- `src/file-preview.tsx` - 文件预览窗口（独立 HTML 入口）
- `rust-service/src/main.rs` - 后端 API 服务

## 开发命令

```bash
npm run dev                 # Vite 开发模式（仅前端）
npm run neutralino:dev      # 完整桌面应用开发模式

npm run build               # 类型检查 + Vite 构建
npm run neutralino:build    # 完整构建（Rust + Vite + Neutralino）

npm run lint && npm run typecheck  # 代码检查（提交前必须通过）
npm run test               # Vitest 单元测试（暂无测试文件）
npm run rust:build         # 仅构建 Rust 服务
npm run rust:test          # Rust 单元测试
```

## 目录结构

```
src/
  components/    # React 组件
  pages/         # 页面组件
  stores/        # Zustand 状态
  lib/           # 工具函数（含 i18n）
  services/api/  # 与 Rust 后端通信的 API 层
rust-service/
  src/api/       # HTTP API handlers
  src/storage/   # Claude/OpenCode/Codebuddy 数据解析
```

## 路径别名

```typescript
import { Foo } from '@/components/Foo';  // src/components/Foo
```

## 多语言 (i18n) ⚠️ 关键陷阱

**翻译文件在 `src/lib/i18n/index.ts`，不是 `src/locales/*.json`**

`src/locales/*.json` 是备份，不会被加载。翻译存储在内联 JS 对象 (`enTranslations`, `zhTranslations`)。

**添加翻译必须**:
1. 在 `src/lib/i18n/index.ts` 同时更新 `enTranslations` 和 `zhTranslations`
2. 不要只更新 `src/locales/*.json`

**使用规范**:
- 按模块分组: `nav.*`, `settings.*`, `common.*`
- 提供默认值兜底: `t('settings.newKey', 'Default')`

## 版本管理

**禁止手动修改版本或打 tag**

版本通过 PR 标签自动管理: `major`/`minor`/`patch`/`skip-release`。合并 PR 后自动升级版本并触发 Release 构建。

## 系统要求

- Node.js >= 20.0.0
- macOS 11.0+ (主要支持 Apple Silicon)
- Rust（构建后端需要）

## 构建产物

- `dist/` - Vite 前端构建
- `dist/yes-sessions/` - Neutralino 打包产物
