# Yes Sessions

一款用于管理 AI CLI 工具会话历史的桌面应用程序。

![Logo](./public/logo.png)

## 功能特性

### 📊 会话管理

- **多应用支持**：Claude Code、OpenCode、Codebuddy
- **会话列表**：按时间分组展示所有历史会话
- **详情查看**：完整的对话历史，包括用户消息、AI 回复、工具调用
- **模型追踪**：显示每条消息使用的 AI 模型（包括模型切换历史）
- **子 Agent 支持**：识别并展示子 Agent 调用及其使用的模型

### 🔍 智能解析

- **文件引用解析**：自动解析 OpenCode/Claude Code 格式的文件引用
- **代码高亮**：支持多种编程语言的语法高亮
- **Markdown 渲染**：AI 回复内容支持 Markdown 格式
- **思考过程展示**：支持显示 AI 的思考/推理过程

### 🎨 界面特性

- **暗色/亮色主题**：支持系统主题自动切换
- **虚拟滚动**：大量会话列表流畅滚动
- **日期折叠**：按日期分组，支持展开/折叠
- **国际化**：支持中文/英文切换
- **工具区块折叠**：支持折叠 Bash/Read/Write/Edit/Glob 等工具调用区块
- **搜索体验优化**：搜索结果展示在内容区域，界面更整洁

## 支持的 AI 工具

| 工具        | 状态        | 说明              |
| ----------- | ----------- | ----------------- |
| Claude Code | ✅ 完全支持 | 新旧格式都支持    |
| OpenCode    | ✅ 完全支持 | SQLite 数据库读取 |
| Codebuddy   | ✅ 完全支持 | JSONL 文件解析    |
| Codex       | 🚧 计划中   | 即将支持          |
| Gemini CLI  | 🚧 计划中   | 即将支持          |

## 技术栈

- **框架**: Electron + React 18 + TypeScript
- **构建**: Vite
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand + TanStack Query
- **国际化**: i18next
- **数据库**: better-sqlite3 (OpenCode)

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建应用
npm run build

# 类型检查
npx tsc --noEmit

# 代码格式化
npm run format
```

## 项目结构

```
src/
  components/      # React 组件
    sessions/      # 会话相关组件
  pages/           # 页面组件
  locales/         # 多语言文件
  stores/          # Zustand 状态管理
  lib/             # 工具函数
  types/           # TypeScript 类型定义
  hooks/           # 自定义 hooks

electron/
  services/        # 主进程服务
    session/       # 各 AI 工具的会话读取服务
  handlers/        # IPC 处理程序
  ipc/             # IPC 通信

```

## 数据读取

### Claude Code

- 新格式：`~/.claude/projects/<project>/<sessionId>.jsonl`
- 旧格式：`~/.claude/transcripts/ses_*.jsonl`

### OpenCode

- 数据库：`~/.local/share/opencode/opencode.db`

### Codebuddy

- 会话文件：`~/.codebuddy/projects/<project>/*.jsonl`

## 开发贡献

### 自动化版本管理

本项目使用自动化版本管理工作流：

1. 从 `main` 分支创建功能分支：`git checkout -b feature/xxx`
2. 开发完成后提交并推送到远程
3. 创建 PR 到 `main` 分支，并添加标签：
   - `major` - 破坏性变更 (x.0.0)
   - `minor` - 新功能 (x.y.0)
   - `patch` - Bug 修复 (x.y.z)
4. 合并 PR 后，版本会自动升级并触发 Release 构建

查看完整文档：[VERSION_MANAGEMENT.md](./docs/VERSION_MANAGEMENT.md)

## 许可证

MIT

---

Made with ❤️ for AI CLI users
