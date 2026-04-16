# Homebrew 分发完整方案

## 📦 已创建的文件

### 1. Homebrew Cask 文件

**位置**: `homebrew-cask/yes-sessions.rb`

这是 Homebrew Cask 的核心定义文件，包含：

- 版本号、下载链接
- SHA256 校验值（需要更新）
- 应用名称和描述
- 自动更新支持
- 卸载时清理的文件（zap）

### 2. GitHub Release 模板

**位置**: `.github/release-template.md`

发布新版本时复制到 GitHub Release 描述中，包含：

- 详细的安装指南（Homebrew + 手动）
- 新版本特性说明
- 系统要求
- macOS "已损坏"问题的解释
- 文件校验值（需要更新）

### 3. 提交指南

**位置**: `docs/HOMEBREW_CASK_GUIDE.md`

详细的 Homebrew Cask 提交步骤：

- 如何提交到官方 Homebrew Cask
- 如何创建个人 Tap
- 如何计算 SHA256
- 自动化脚本

### 4. Tap README

**位置**: `homebrew-tap-README.md`

如果你创建个人 Tap，这是 Tap 仓库的 README 模板。

### 5. GitHub Actions 工作流

**位置**: `.github/workflows/release.yml`

自动化发布流程：

- 构建 macOS 应用
- 计算 SHA256 校验值
- 创建 GitHub Release
- 可扩展：自动更新 Homebrew Cask

### 6. 一键安装脚本 ⭐ 推荐

**位置**: `scripts/install.sh`

**文档**: `docs/INSTALL_SCRIPT.md`

最简单的安装方式，无需维护版本号：

```bash
curl -fsSL https://raw.githubusercontent.com/KrabsWong/agent-manager/main/scripts/install.sh | bash
```

**特点：**

- ✅ 自动从 GitHub API 获取最新版本
- ✅ 支持指定版本安装 `-v 5.6.0`
- ✅ 自动移除 quarantine 标记
- ✅ 无需手动更新版本号
- ✅ 无需等待 Homebrew 审核

---

## 🚀 快速开始

### 方案一：一键安装脚本（⭐ 最简单，推荐）

**无需任何配置，脚本自动获取最新版本**

```bash
# 安装最新版本
curl -fsSL https://raw.githubusercontent.com/KrabsWong/agent-manager/main/scripts/install.sh | bash

# 或安装指定版本
curl -fsSL https://raw.githubusercontent.com/KrabsWong/agent-manager/main/scripts/install.sh | bash -s -- -v 5.6.0
```

**优点：**

- ✅ 自动从 GitHub API 获取最新版本，无需手动更新版本号
- ✅ 用户直接运行一条命令即可安装
- ✅ 自动移除 quarantine 标记
- ✅ 无需创建额外仓库或等待审核

**缺点：**

- ❌ 需要网络访问 GitHub API
- ❌ 没有 `brew upgrade` 更新功能

---

### 方案二：个人 Homebrew Tap

**适合需要通过 `brew install` 安装的用户**

#### 步骤 1: 计算 SHA256 校验值

```bash
# 构建应用
npm run build:mac

# 计算 arm64 版本 SHA256
shasum -a 256 dist/Yes-Sessions-5.6.0-arm64.dmg
# 输出示例: a1b2c3d4e5f6...  Yes-Sessions-5.6.0-arm64.dmg

# 计算 x64 版本 SHA256
shasum -a 256 dist/Yes-Sessions-5.6.0-x64.dmg
```

### 步骤 2: 更新 Cask 文件中的 SHA256

编辑 `homebrew-cask/yes-sessions.rb`：

```ruby
cask "yes-sessions" do
  version "5.6.0"
  sha256 arm: "YOUR_ARM64_SHA256", intel: "YOUR_X64_SHA256"
  # ...
end
```

### 步骤 3: 创建 GitHub Release

1. 在 GitHub 创建 Release: https://github.com/KrabsWong/agent-manager/releases/new
2. Tag: `v5.6.0`
3. 复制 `.github/release-template.md` 内容到描述框
4. 上传构建产物（DMG、EXE、AppImage）
5. 更新描述中的 SHA256 值
6. 发布

### 步骤 4: 创建 Homebrew Tap（可选）

如果你想让用户通过 `brew install` 安装：

1. 在 GitHub 创建仓库 `homebrew-yes-sessions`
2. 创建目录结构：
   ```
   Casks/
   └── yes-sessions.rb   # 复制 homebrew-cask/yes-sessions.rb
   README.md             # 复制 homebrew-tap-README.md
   ```
3. 提交并推送

用户安装方式：

```bash
brew tap krabswong/yes-sessions
brew install --cask yes-sessions
```

---

## 📋 文件清单

```
yes-sessions/
├── homebrew-cask/
│   └── yes-sessions.rb           # Cask 定义文件
├── .github/
│   ├── release-template.md       # Release 描述模板
│   └── workflows/
│       └── release.yml           # 自动化发布工作流
├── docs/
│   └── HOMEBREW_CASK_GUIDE.md    # 详细提交指南
└── homebrew-tap-README.md        # Tap 仓库 README 模板
```

---

## ⚠️ 重要提醒

### 关于 SHA256

**必须**在每次发布新版本后更新 Cask 文件中的 SHA256 值。

校验值的作用：

- 确保下载的文件完整未被篡改
- Homebrew 安装时的安全检查

### 关于代码签名

Homebrew Cask 不会解决 macOS "文件已损坏" 的问题。用户仍然需要：

- 运行 `xattr -c` 命令，或
- 在系统设置中允许运行

这是因为：

- Homebrew 只是分发渠道
- Gatekeeper 安全检查仍然存在
- 只有 Apple Developer 签名才能完全解决

---

## 🎯 下一步行动

1. **立即**: 创建 GitHub Release v5.6.0，上传构建产物
2. **短期**: 创建个人 Homebrew Tap（如果需要 brew install 体验）
3. **长期**: 考虑申请 Apple Developer 账号（$99/年）进行官方签名

---

## 📚 参考链接

- [Homebrew Cask 官方文档](https://docs.brew.sh/Cask-Cookbook)
- [Homebrew Tap 指南](https://docs.brew.sh/Taps)
- [Electron 应用签名指南](https://www.electronjs.org/docs/latest/tutorial/code-signing)
