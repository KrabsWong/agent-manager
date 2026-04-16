# Homebrew Cask - yes-sessions

🍺 Homebrew Tap for Yes Sessions - AI Session Manager

## 安装

```bash
# 添加 Tap
brew tap krabswong/yes-sessions

# 安装
brew install --cask yes-sessions

# 升级
brew upgrade --cask yes-sessions
```

## 关于 Yes Sessions

Yes Sessions 是一个 AI 会话管理工具，帮助你浏览和恢复与 AI 应用程序（Claude Code、OpenCode 等）的对话历史。

**功能特性：**

- 📚 浏览所有 AI 应用的会话历史
- 🔍 搜索会话内容
- 📊 会话统计和分析
- 🎨 支持深色/浅色主题
- 💭 可选择显示/隐藏 AI 思考过程
- 🔔 设置变更 Toast 通知

**官网**: https://github.com/KrabsWong/agent-manager

## 系统要求

- macOS 11.0+ (Big Sur)
- Apple Silicon 或 Intel Mac

## ⚠️ 关于安全提示

由于应用未经过 Apple 官方签名，首次运行可能需要：

1. 系统设置 → 隐私与安全性 → 安全性
2. 点击"仍要打开"

或者手动移除安全隔离属性：

```bash
xattr -cr /Applications/Yes-Sessions.app
```

## 卸载

```bash
brew uninstall --cask yes-sessions
brew untap krabswong/yes-sessions
```

## 许可证

MIT License - 详见 [LICENSE](https://github.com/KrabsWong/agent-manager/blob/main/LICENSE)
