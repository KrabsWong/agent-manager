# AGENTS.md

## 项目概述

Yes Sessions - 管理 AI CLI 工具的桌面应用程序（Electron + React + TypeScript）

## 技术栈

- **框架**: React 18 + TypeScript
- **桌面**: Electron
- **样式**: Tailwind CSS
- **组件**: shadcn/ui
- **状态管理**: Zustand
- **国际化**: i18next + react-i18next
- **构建**: Vite

## 目录结构

```
src/
  components/    # React 组件
  pages/         # 页面组件
  locales/       # 多语言翻译文件 (en.json, zh.json)
  stores/        # Zustand 状态管理
  lib/           # 工具函数
  types/         # TypeScript 类型定义
  hooks/         # 自定义 hooks
```

## 关键约定

### 多语言 (i18n) - 强制遵循

**⚠️ 重要：翻译文件位置是 `src/lib/i18n/index.ts`，不是 `src/locales/*.json`**

i18n 配置使用的是**内联的 JavaScript 对象**（`enTranslations` 和 `zhTranslations`），`src/locales/*.json` 文件只是备份/参考，**不会被实际加载**。

**Bad Cases & 必须避免的问题**:

1. **永远不要假设 key 存在** - 这是最常见的 bug

   ```typescript
   // ❌ 错误 - 直接引用可能不存在的 key
   t('settings.languageDescription');

   // ✅ 正确 - 提供兜底或使用已确认的 key
   t('settings.languageDescription', '选择您偏好的语言');
   // 或更好的做法：先添加到翻译对象再使用
   ```

2. **新增 key 必须同时更新 `src/lib/i18n/index.ts` 中的两个对象**

   ```typescript
   // ❌ 错误 - 只更新 src/locales/*.json（这些文件不会被使用！）
   // 或只更新 enTranslations 不更新 zhTranslations

   // ✅ 正确 - 同步更新 src/lib/i18n/index.ts 中的内联对象
   // const enTranslations = { settings: { languageDescription: 'Select...' } }
   // const zhTranslations = { settings: { languageDescription: '选择...' } }
   ```

3. **不要在代码里硬编码中文/英文**

   ```typescript
   // ❌ 错误 - 硬编码文本
   <Button>取消</Button>
   <span>Error loading</span>

   // ✅ 正确 - 全部走翻译
   <Button>{t('common.buttons.cancel')}</Button>
   <span>{t('common.errors.loading')}</span>
   ```

4. **嵌套 key 要使用完整路径**

   ```typescript
   // ❌ 错误 - 可能混淆命名空间
   t('title');

   // ✅ 正确 - 完整路径
   t('providers.title');
   t('settings.generalTitle');
   ```

5. **Key 命名规范**
   - 使用 camelCase
   - 按功能模块分组：nav._, providers._, settings._, common._
   - 描述性文本用 Description 后缀：themeDescription

**添加新翻译的标准流程**:

1. 先在 `src/lib/i18n/index.ts` 的 `enTranslations` 和 `zhTranslations` 中添加 key
2. 然后在组件中使用 `t('module.key')`
3. 如果可能缺失，使用 `t('key', '兜底文本')`
4. （可选）同步更新 `src/locales/*.json` 保持备份一致性

### 组件规范

- 使用函数式组件 + hooks
- Props 类型必须显式定义
- 复杂组件拆分为子组件

### 状态管理

- 本地状态：useState/useReducer
- 全局状态：Zustand stores/
- 避免 prop drilling

### 样式规范

- 优先使用 Tailwind 类名
- shadcn/ui 组件使用 cn() 合并类名
- 响应式设计使用 Tailwind 断点

### 类型安全

- 所有函数参数和返回值必须标注类型
- 复杂对象使用 interface/type
- 避免使用 any

## 常见模式

### 添加新页面

1. 在 `src/pages/` 创建目录和 index.tsx
2. 在 `src/locales/` 添加页面文本
3. 在导航配置中添加路由

### 使用多语言

```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('page.title')}</h1>;
}
```

### Zustand Store

```typescript
import { create } from 'zustand';

interface Store {
  value: string;
  setValue: (v: string) => void;
}

export const useStore = create<Store>((set) => ({
  value: '',
  setValue: (v) => set({ value: v }),
}));
```

## 构建与开发

```bash
# 开发
npm run dev

# 构建
npm run build

# 类型检查
npx tsc --noEmit
```

## 注意事项

- 推送代码必须先创建并推送开发分支，禁止直接推送到 `main`。
- 修改 Electron 主进程需重启应用
- 新增依赖后需要重新安装
- 多语言 key 变更后需检查所有引用处
