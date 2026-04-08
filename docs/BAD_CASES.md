# 开发 Bad Case 记录

本文档记录开发 CC Switch 过程中遇到的问题及其解决方案，供后续开发参考。

## Electron + Vite + ES Modules 常见问题

### 1. __dirname is not defined

**错误信息：**
```
ReferenceError: __dirname is not defined
    at createWindow (file:///.../dist-electron/main.js:19509:28)
```

**问题原因：**
在 ES Modules（ESM）中，`__dirname` 是 CommonJS 特有的全局变量，不可用。

**解决方案：**
使用 `import.meta.url` 和 `fileURLToPath` 模拟 `__dirname`：

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**参考文件：**
- `electron/main.ts`

---

### 2. Preload 脚本不能使用 ES Module 语法

**错误信息：**
```
Unable to load preload script: /.../dist-electron/preload.js
SyntaxError: Cannot use import statement outside a module
```

**问题原因：**
Electron 的 preload 脚本在渲染进程中运行，必须使用 CommonJS 格式（require/module.exports），不能使用 ES Module 语法（import/export）。Vite 的构建配置无法强制改变 preload 脚本的输出格式。

**解决方案：**
**方法1：直接使用 CommonJS 语法（推荐）**

修改 `electron/preload.ts`，使用 `require()` 而不是 `import`：

```typescript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]) => callback(...args)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
```

同时需要在前端添加类型声明 `src/types/electron.d.ts`：

```typescript
export interface IElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export {};
```

**方法2：Vite 配置（不推荐，实际测试无效）**

在 `vite.config.ts` 中尝试配置输出格式：

```typescript
{
  entry: 'electron/preload.ts',
  vite: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',  // 尝试强制 CommonJS
        },
      },
    },
  },
}
```

> ⚠️ **注意**：实际测试发现，在 vite-plugin-electron 中，rollupOptions.output.format 配置对 preload 脚本不生效。最可靠的方法是直接使用 CommonJS 语法。

**参考文件：**
- `vite.config.ts`
- `electron/preload.ts`
- `src/types/electron.d.ts`

---

### 3. Tailwind CSS 在开发模式下不生效

**错误信息：**
Tailwind CSS 类名在开发模式下没有被正确处理，样式不生效。

**问题原因：**
- 缺少 PostCSS 配置
- package.json 中缺少 `"type": "module"`

**解决方案：**
1. 创建 `postcss.config.js`：
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

2. 在 `package.json` 中添加：
```json
{
  "type": "module"
}
```

**参考文件：**
- `postcss.config.js`
- `package.json`

---

## 开发规范

### ES Modules vs CommonJS

| 场景 | 推荐格式 | 说明 |
|------|---------|------|
| Electron Main 进程 | ES Modules | 使用 `.ts` + `import.meta.url` 模拟 `__dirname` |
| Electron Preload 脚本 | CommonJS | 使用 `require()` 语法，见问题 #2 |
| 渲染进程 (React) | ES Modules | 标准 Vite React 配置 |

### 文件命名规范

- Main 进程：`electron/main.ts`
- Preload 脚本：`electron/preload.ts`（输出为 `.js`）
- IPC 处理器：`electron/handlers/*.ts`
- 服务层：`electron/services/**/*.ts`

### 注意事项

1. **preload 脚本必须保持简单**：只暴露必要的 API，不要包含业务逻辑
2. **contextIsolation 必须开启**：安全要求，防止渲染进程直接访问 Node.js API
3. **nodeIntegration 必须关闭**：安全要求，防止渲染进程直接访问 Node.js
4. **IPC 通道命名规范**：使用 `category:action` 格式，如 `providers:getAll`
