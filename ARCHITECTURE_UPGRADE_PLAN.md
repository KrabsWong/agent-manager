# Yes Sessions 架构升级计划 v1.0

> 基于 claude-sonnet-4.6 架构评审报告的综合分析  
> 制定日期：2026-04-23  
> 预估总工期：4-5 天

---

## 执行优先级总览

| 阶段 | 任务 | 优先级 | 预估工期 | 风险 |
|-----|------|-------|---------|-----|
| 1 | 清理与快速修复 | P0 | 0.5 天 | 低 |
| 2 | ConversationView 拆分 | P0 | 2-3 天 | 中 |
| 3 | IPC 架构统一 | P1 | 1 天 | 中 |
| 4 | Store 合并重构 | P1 | 0.5 天 | 中 |
| 5 | Service Registry | P2 | 1-2 天 | 中 |
| - | ~~i18n JSON 化~~ | ~~P3~~ | - | 不推荐 |
| - | ~~Repository/DB~~ | ~~P3~~ | - | 不推荐 |

---

## 阶段 1：清理与快速修复（Day 1 上午）

### 1.1 删除空目录
- [ ] 删除 `src/contexts/`（已确认为空）
- [ ] 删除 `src/lib/schemas/`（已确认为空）

### 1.2 消除重复 APP_COLORS
**现状**：`AppIcons.tsx` 和 `config/apps.ts` 两处定义完全相同

**实施步骤**：
1. 确认 `Sessions/index.tsx` 从 `AppIcons.tsx` 导入 `APP_COLORS`
2. 确认 `getAppInfo()` 在 `config/apps.ts` 内部消费另一份定义
3. 统一导出源：将 `AppIcons.tsx` 的导入改为从 `config/apps.ts` 导入
4. 删除 `AppIcons.tsx` 中的重复定义

**验收标准**：
```bash
# 确认只剩一处定义
grep -r "APP_COLORS" src/ --include="*.ts" --include="*.tsx" | wc -l
# 预期输出：2（一处 export，一处 import）
```

### 1.3 添加 tsconfig Path Alias
**目标**：消除 `../../../src/` 这类混乱的相对路径

**实施步骤**：
1. 在 `tsconfig.json` 添加：
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@shared/*": ["./src/types/*"]
       }
     }
   }
   ```
2. 同步更新 `vite.config.ts` 的 resolve.alias
3. （可选）批量替换最深层的路径引用

**不做的**：独立 npm 包方案（过度工程化）

---

## 阶段 2：ConversationView 拆分（Day 1 下午 - Day 3）

**现状**：`ConversationView.tsx` 2657 行，两份报告一致认定的最高优先级重构

### 2.1 子组件拆分策略

建议拆分为 **5-7 个文件**（平衡可维护性和调试便利性）：

```
src/components/ConversationView/
├── index.tsx              # 主组件（~300 行）
├── Header.tsx             # 头部区域
├── MessageList.tsx        # 消息列表容器
├── MessageItem.tsx        # 单条消息
├── InputArea.tsx          # 输入区域
├── hooks/
│   └── useConversation.ts # 相关 hooks
└── types.ts               # 组件专属类型
```

### 2.2 实施步骤

**Step 1 - 类型与常量提取（0.5 天）**
- [ ] 提取组件 Props 类型到 `types.ts`
- [ ] 提取本地常量（如样式配置、默认配置）
- [ ] 验证提取后原文件仍能编译通过

**Step 2 - Hooks 抽取（0.5 天）**
- [ ] 识别可以独立的状态逻辑
- [ ] 抽取为自定义 hooks 到 `hooks/` 目录
- [ ] 添加 hook 的基础单元测试

**Step 3 - 子组件拆分（1-1.5 天）**
- [ ] 按 UI 区域拆分：Header / MessageList / MessageItem / InputArea
- [ ] 保持 props 接口稳定，避免级联改动
- [ ] 每个子组件拆出后运行 smoke test

**Step 4 - 主组件清理（0.5 天）**
- [ ] 清理原文件的重复代码
- [ ] 验证功能完整
- [ ] 性能对比（渲染时间、bundle 体积）

### 2.3 风险控制

| 风险 | 缓解措施 |
|-----|---------|
| 拆分引入 bug | 每拆一步运行一次完整功能验证 |
| props drilling | 适度使用 React Context 传递深层数据 |
| 过度拆分 | 保持 5-7 文件，拒绝拆出 10+ 个微小组件 |

---

## 阶段 3：IPC 架构统一（Day 4）

**现状**：`main.ts` 中有 **9 个 channel** 绕过 `ipcRegistry`，直接使用 `ipcMain.handle` 注册

### 3.1 问题清单

```typescript
// 当前直接注册的 channels（需迁移）
'shell:openExternal'
'shell:openPath'
'file-preview:open'
'tree:get'
'git:status'
'git:branch'
'git:log'
'git:diff'
// ... 等
```

### 3.2 实施步骤

**Step 1 - 创建 IPC_CHANNELS 常量表**
```typescript
// src/lib/ipc/channels.ts
export const IPC_CHANNELS = {
  SHELL: {
    OPEN_EXTERNAL: 'shell:openExternal',
    OPEN_PATH: 'shell:openPath',
  },
  FILE_PREVIEW: {
    OPEN: 'file-preview:open',
  },
  TREE: {
    GET: 'tree:get',
  },
  GIT: {
    STATUS: 'git:status',
    BRANCH: 'git:branch',
    LOG: 'git:log',
    DIFF: 'git:diff',
  },
} as const;
```

**Step 2 - 迁移 main.ts 中的 handler 到 registry**
- [ ] 将 9 个直接注册的 channel 迁移到 `ipcRegistry`
- [ ] 删除 `ipcMain.handle` 直接调用

**Step 3 - 更新 renderer 侧调用**
- [ ] 将 `ThemeProvider.tsx` 4 处直接 invoke 改为调用 api 层
- [ ] 将 `sessions.ts` 的 `file-preview:open` 改为调用 api 层
- [ ] 更新 `electron.d.ts` 中的类型声明

**Step 4 - 验证一致性**
```bash
# 确认所有 channel 都走 registry
grep -n "ipcMain.handle" src/main.ts
# 预期输出：无匹配（只剩 registry 注册）
```

### 3.3 依赖改动

| 文件 | 改动 |
|-----|------|
| `main.ts` | 删除 9 处直接注册，改用 registry |
| `ipcRegistry.ts` | 添加新 handler |
| `electron.d.ts` | 更新 channel 类型 |
| `ThemeProvider.tsx` | 改用 api 层调用 |
| `Sessions/index.tsx` | 改用 api 层调用 |

---

## 阶段 4：Store 合并重构（Day 4 下午）

**现状**：`settings.ts` 和 `experience.ts` 存在重复逻辑，ThemeProvider 也独立管理状态

### 4.1 目标结构

```typescript
// src/stores/settings.ts - 合并后
interface SettingsStore {
  // 原 settings
  language: string;
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  
  // 原 experience
  autoLaunch: boolean;
  minimizeToTray: boolean;
  // ...
  
  // Actions
  updateSetting: <K extends keyof SettingsStore>(
    key: K, 
    value: SettingsStore[K]
  ) => void;
}
```

### 4.2 实施步骤

**Step 1 - 合并 store（0.5 天）**
- [ ] 将 `experience.ts` 的状态和 actions 合并到 `settings.ts`
- [ ] 使用 `updateSetting<K>` 泛型设计统一更新接口
- [ ] 保持 `persist` 中间件自动写入 localStorage

**Step 2 - 重构 ThemeProvider（0.5 天）**
- [ ] ThemeProvider 改为从合并后的 store 读取主题状态
- [ ] 删除 ThemeProvider 内部的独立状态管理
- [ ] 删除 ThemeProvider 中的直接 IPC invoke

**Step 3 - 迁移调用方**
- [ ] 更新所有使用 `useExperienceStore` 的组件
- [ ] 统一使用 `useSettingsStore`
- [ ] 删除 `experience.ts`

### 4.3 注意事项

- 初始值来源：`__INITIAL_SETTINGS__` 从主进程注入，需确认与 localStorage 的优先级
- 同步时机：确保合并后 settings 同步到主进程的逻辑仍然正确

---

## 阶段 5：Service Registry 模式（Day 5 可选）

**现状**：`sessions.ts` 中 `getAll`/`getDetail`/`getStats` 使用 if-else 判断服务类型

### 5.1 建议调整

原报告评级 **P0**，建议降为 **P1/P2** 原因：
- `getSupportStatus` 已使用 lookup table，无需改造
- `getDetail` 有特殊的 fallthrough 语义（顺序尝试各服务），改造需谨慎
- `resume` 已无 if-else 分支
- 真正需要改造的只有 3 个方法

### 5.2 轻量级方案

```typescript
// src/services/SessionServiceRegistry.ts
interface SessionService {
  name: string;
  getAll: () => Promise<Session[]>;
  getDetail: (id: string) => Promise<SessionDetail | null>;
  getStats: () => Promise<Stats>;
}

class SessionServiceRegistry {
  private services: Map<string, SessionService> = new Map();
  
  register(name: string, service: SessionService) {
    this.services.set(name, service);
  }
  
  get(name: string): SessionService | undefined {
    return this.services.get(name);
  }
  
  getAll(): SessionService[] {
    return Array.from(this.services.values());
  }
}
```

### 5.3 实施步骤

- [ ] 创建 Registry 类
- [ ] 注册各服务（Claude / Warp / Cursor 等）
- [ ] 改造 `getAll` / `getStats` 使用 registry 迭代
- [ ] `getDetail` 单独处理 fallthrough 逻辑
- [ ] 添加基础单元测试

---

## 明确不做的事项

| 建议 | 不做原因 | 替代方案 |
|-----|---------|---------|
| i18n JSON 化 | 当前只有双语、团队规模小，JSON 化收益低；失去 TS 类型检查 | 保持内联对象，维持 AGENTS.md 规范 |
| Repository + DB 缓存 | 应用定位"只读"外部 session，引入 DB 增加缓存一致性复杂度 | 保持文件系统读取，如确有性能问题再考虑 |
| 共享类型独立 npm 包 | 单仓库 Electron 应用过度工程化 | 使用 tsconfig path alias（阶段 1.3） |
| 过度细粒度组件拆分 | 10+ 个微小组件增加调试路径 | 保持 5-7 个文件粒度 |

---

## 测试策略

### 每阶段必做
- [ ] TypeScript 编译检查：`npx tsc --noEmit`
- [ ] 开发环境功能验证
- [ ] 生产构建验证：`npm run build`

### 关键路径验证
| 功能 | 验证点 |
|-----|-------|
| 会话列表加载 | 各类型会话（Claude/Warp/Cursor）正常显示 |
| 会话详情查看 | 点击会话正确加载详情 |
| 主题切换 | 明暗模式切换正常 |
| 文件预览 | 点击文件路径能打开预览 |
| 设置保存 | 修改设置后刷新保持 |

---

## 回滚策略

每个阶段独立分支：
```bash
# 阶段 1
architecture-upgrade/phase1-cleanup

# 阶段 2
architecture-upgrade/phase2-conversation-view

# 阶段 3
architecture-upgrade/phase3-ipc-unification

# 阶段 4
architecture-upgrade/phase4-store-merge
```

如某阶段出现问题，可单独回滚该阶段而不影响其他阶段。

---

## 预期收益

| 指标 | 当前状态 | 预期改善 |
|-----|---------|---------|
| ConversationView 文件大小 | 2657 行 | ~300 行主文件 + 子组件 |
| IPC 注册一致性 | 9 处直接注册 | 全部走 registry |
| Settings 相关文件 | 3 个（settings/experience/ThemeProvider）| 1 个统一 store |
| 深层相对路径 | 多处 `../../../` | 统一使用 `@/` alias |

---

**下一步行动**：等待 Review 确认后，按阶段依次执行。
