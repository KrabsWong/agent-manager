# Yes Sessions

AI CLI 工具会话管理器 - 浏览、搜索和管理与 AI 应用的对话历史。

![Logo](./public/logo.png)

## 安装

### 方式一：一键安装脚本（推荐）

自动下载并安装最新版本：

```bash
curl -fsSL https://raw.githubusercontent.com/KrabsWong/agent-manager/main/scripts/install.sh | bash
```

安装指定版本：

```bash
curl -fsSL https://raw.githubusercontent.com/KrabsWong/agent-manager/main/scripts/install.sh | bash -s -- -v 5.6.0
```

### 方式二：Homebrew

```bash
brew tap krabswong/yes-sessions
brew install --cask yes-sessions
```

### 方式三：手动安装

1. 从 [Releases](https://github.com/KrabsWong/agent-manager/releases) 下载对应架构的 DMG
2. 移除安全隔离属性：
   ```bash
   xattr -c ~/Downloads/Yes-Sessions-*.dmg
   ```
3. 双击挂载 DMG 并拖动应用到 Applications 文件夹

### 系统要求

- macOS 11.0+ (Big Sur)
- Apple Silicon 或 Intel 处理器

---

## 功能特性

### 会话管理

- **多应用支持**：Claude Code、OpenCode、Codebuddy
- **会话列表**：按时间分组展示历史会话
- **详情查看**：完整的对话历史，包括用户消息、AI 回复、工具调用
- **模型追踪**：显示每条消息使用的 AI 模型
- **子 Agent 支持**：识别并展示子 Agent 调用及其使用的模型
- **会话恢复**：一键恢复会话到终端继续对话

### 内置终端

- **多标签支持**：同时打开多个会话标签
- **拖拽调整**：支持拖拽调整终端面板高度
- **最小化**：可最小化到页面底部，随时恢复
- **集成会话**：点击 Resume 自动在内置终端打开对应会话
- **终端选择**：支持 Ghostty、Kitty、Terminal.app 或内置终端

### 智能解析

- **文件引用解析**：自动解析 OpenCode/Claude Code 格式的文件引用
- **代码高亮**：支持多种编程语言的语法高亮
- **Markdown 渲染**：AI 回复内容支持 Markdown 格式
- **思考过程展示**：可选择显示 AI 的思考/推理过程

### 界面特性

- **主题切换**：支持深色/浅色主题，可跟随系统
- **虚拟滚动**：大量会话列表流畅滚动
- **日期折叠**：按日期分组，支持展开/折叠
- **国际化**：支持中文/英文界面切换
- **工具区块折叠**：支持折叠 Bash/Read/Write/Edit/Glob 等工具调用区块
- **搜索功能**：会话内容全文搜索

---

## 支持的 AI 工具

| 工具        | 状态     | 说明           |
| ----------- | -------- | -------------- |
| Claude Code | 完全支持 | 新旧格式都支持 |
| OpenCode    | 完全支持 | SQLite 数据库  |
| Codebuddy   | 完全支持 | JSONL 文件解析 |
| Codex       | 计划中   | 即将支持       |
| Gemini CLI  | 计划中   | 即将支持       |

---

## 开发

### 技术栈

- **框架**: React 18 + TypeScript
- **桌面**: Neutralinojs
- **构建**: Vite
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand + TanStack Query
- **国际化**: i18next
- **数据库**: better-sqlite3

### 快速开始

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

### 项目结构

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
```

---

## 数据存储路径

### Claude Code

- 新格式：`~/.claude/projects/<project>/<sessionId>.jsonl`
- 旧格式：`~/.claude/transcripts/ses_*.jsonl`

### OpenCode

- 数据库：`~/.local/share/opencode/opencode.db`

### Codebuddy

- 会话文件：`~/.codebuddy/projects/<project>/*.jsonl`

---

## 版本管理

本项目使用自动化版本管理工作流：

1. 从 `main` 分支创建功能分支
2. 开发完成后提交并推送到远程
3. 创建 PR 到 `main` 分支，并添加标签：
   - `major` - 破坏性变更 (x.0.0)
   - `minor` - 新功能 (x.y.0)
   - `patch` - Bug 修复 (x.y.z)
4. 合并 PR 后自动升级版本并触发 Release 构建

详细文档：[docs/VERSION_MANAGEMENT.md](./docs/VERSION_MANAGEMENT.md)

---

## 许可证

MIT

---

Made for AI CLI users
