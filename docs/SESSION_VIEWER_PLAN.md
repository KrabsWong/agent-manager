# Phase X: Session 查看器实现计划

## 目标

实现本地 session 详细信息查看面板，支持查看 Claude Code 等应用的对话历史。

## 功能设计

### 1. 页面结构

- 左侧：Application 选择器
- 中间：Session 列表
- 右侧：Session 详情（对话内容）

### 2. 支持的应用

- **Claude Code**: 完全支持，读取 ~/.claude/transcripts/
- **其他应用**: 显示"接入中"占位符

### 3. Claude Code Session 格式

- 存储位置: `~/.claude/transcripts/`
- 文件格式: JSONL (每行一个 JSON 对象)
- 文件名: `ses_<id>.jsonl`
- 消息类型: user, tool_use, tool_result

### 4. 实现步骤

1. 创建后端服务读取 Claude Code transcripts
2. 创建 Session 类型定义
3. 创建 IPC handlers
4. 创建前端页面组件
5. 添加到左侧导航
6. 多语言支持

## 文件清单

- `electron/services/session/claude.ts` - Claude Code session 读取服务
- `electron/handlers/sessions.ts` - IPC handlers
- `src/types/session.ts` - Session 类型定义
- `src/pages/Sessions/index.tsx` - Session 查看器页面
- `src/components/sessions/SessionList.tsx` - Session 列表组件
- `src/components/sessions/SessionDetail.tsx` - Session 详情组件
- `src/hooks/useSessions.ts` - React hooks

## 多语言 Keys

- nav.sessions
- sessions.title
- sessions.description
- sessions.selectApp
- sessions.claudeSupport
- sessions.comingSoon
- sessions.noSessions
- sessions.loading
- sessions.error
