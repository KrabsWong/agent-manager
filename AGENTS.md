# AGENTS.md

## 项目概述

Yes Sessions - AI CLI 工具会话管理器桌面应用（Electron + React 18 + TypeScript）

## 技术栈

- **框架**: React 18 + TypeScript
- **桌面**: Electron 30
- **构建**: Vite + electron-builder
- **样式**: Tailwind CSS + shadcn/ui
- **状态**: Zustand + TanStack Query
- **数据库**: better-sqlite3

## 开发命令

```bash
npm run dev          # 开发模式（Vite dev server + Electron）
npm run build        # 生产构建（macOS）
npm run build:mac    # macOS 构建
npm run build:win    # Windows 构建
npm run build:linux  # Linux 构建

npm run test         # Vitest 单元测试
npm run test:ui      # Vitest UI 界面
npm run test:e2e     # Playwright E2E 测试

npm run lint         # ESLint 检查
npm run lint:fix     # ESLint 自动修复
npm run format       # Prettier 格式化
npm run typecheck    # TypeScript 类型检查
```

**构建顺序**: `tsc` → `vite build` → `electron-builder`（已在 npm scripts 中串联）

## 目录结构

```
src/
  components/    # React 组件
  pages/         # 页面组件
  stores/        # Zustand 状态管理
  lib/           # 工具函数（含 i18n）
  types/         # TypeScript 类型定义
  hooks/         # 自定义 hooks

electron/
  main.ts        # 主进程入口
  preload.ts     # 预加载脚本
  services/      # 各 AI 工具的会话解析服务
  handlers/      # IPC 处理程序
  ipc/           # IPC 通信
  database/      # 数据库相关
```

## 路径别名

```typescript
import { Foo } from '@/components/Foo';     // src/components/Foo
import { bar } from '@electron/services/...'; // electron/services/...
```

## 多语言 (i18n) - 关键约定

**⚠️ 翻译文件位置: `src/lib/i18n/index.ts`，不是 `src/locales/*.json`**

翻译使用内联 JavaScript 对象（`enTranslations` 和 `zhTranslations`），`src/locales/*.json` 只是备份。

### 必须遵守

1. **新增 key 必须同时更新 `src/lib/i18n/index.ts` 的两个对象**
   - 更新 `enTranslations` 和 `zhTranslations`
   - 不要只更新 `src/locales/*.json`（不会被加载）

2. **不要假设 key 存在**
   ```typescript
   // ❌ 错误 - key 可能不存在
   t('settings.newKey');
   
   // ✅ 正确 - 提供兜底
   t('settings.newKey', 'Default text');
   ```

3. **不要硬编码文本**
   ```typescript
   // ❌ 错误
   <Button>取消</Button>
   
   // ✅ 正确
   <Button>{t('common.buttons.cancel')}</Button>
   ```

4. **Key 命名规范**
   - 使用 camelCase
   - 按模块分组: `nav.*`, `providers.*`, `settings.*`, `common.*`
   - 描述性文本用 `Description` 后缀

### 添加新翻译流程

1. 在 `src/lib/i18n/index.ts` 的 `enTranslations` 和 `zhTranslations` 中添加 key
2. 在组件中使用 `t('module.key')`
3. （可选）同步更新 `src/locales/*.json` 保持备份一致

## Electron 注意事项

- **修改主进程代码需重启应用**（热更新不支持主进程）
- 入口文件: `electron/main.ts`（主进程）、`electron/preload.ts`（预加载）
- 生产构建会启用代码混淆，开发构建不会

## 版本管理与发布

**不要手动打 tag 或修改 package.json 版本**

版本通过 PR 标签自动管理：
- `major` → 破坏性变更 (x.0.0)
- `minor` → 新功能 (x.y.0)
- `patch` → Bug 修复 (x.y.z)
- `skip-release` → 跳过发布

**正确流程**:
1. 从 `main` 创建功能分支
2. 开发完成后推送到远程
3. 创建 PR 到 `main`，添加版本标签
4. 合并 PR 后自动升级版本并触发 Release 构建

## 系统要求

- **Node.js**: >= 20.0.0
- **macOS**: 11.0+ (Big Sur) - 主要支持 Apple Silicon

## 常见陷阱

- 修改 `electron/*.ts` 后需手动重启开发服务器
- 新增 native 依赖（better-sqlite3、keytar、node-pty）后需 `npm run postinstall`
- 生产构建产物在 `dist/`（前端）和 `dist-electron/`（Electron）
