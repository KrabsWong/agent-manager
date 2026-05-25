# 自动化版本管理指南

本项目采用全自动版本管理流程，无需手动修改版本号或打 tag。

## 工作流程

### 1. 开发阶段（Feature Branch）

```bash
# 从 main 创建功能分支
git checkout main
git pull origin main
git checkout -b feature/my-new-feature

# 开发你的功能
# ... 编写代码 ...

# 提交并推送
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature
```

⚠️ **重要**：在开发分支上**不要**修改 `package.json` 中的版本号！

### 2. 创建 Pull Request

在 GitHub 上创建 PR，从 `feature/my-new-feature` 合并到 `main`。

**PR 标签决定版本升级类型：**

| 标签    | 版本变化 | 示例          |
| ------- | -------- | ------------- |
| `major` | x.0.0    | 8.2.1 → 9.0.0 |
| `minor` | x.y.0    | 8.2.1 → 8.3.0 |
| `patch` | x.y.z    | 8.2.1 → 8.2.2 |

**默认行为**：如果没有标签，会自动使用 `patch`（小版本升级）

### 3. 合并触发自动化

当 PR 被合并到 `main` 后，自动化流程会立即启动：

1. ✅ 读取当前版本号（从 main 分支的 package.json）
2. ✅ 根据 PR 标签递增版本号
3. ✅ 更新 package.json 和 package-lock.json
4. ✅ 提交版本变更到 main
5. ✅ 自动创建 git tag（如 v8.3.0）
6. ✅ 触发 Release 构建流程

### 4. Release 构建

tag 创建后会自动触发 `.github/workflows/release.yml`：

1. 验证版本号一致性（安全检查）
2. 构建 macOS 应用
3. 创建 GitHub Release
4. 更新 Homebrew Tap（如果已配置）

## 标签使用指南

### 何时使用 patch？

- Bug 修复
- 性能优化
- 文档更新
- 代码重构
- 小型 UI 调整

### 何时使用 minor？

- 新功能添加
- 新页面/组件
- API 变更（向后兼容）
- 重要的 UX 改进

### 何时使用 major？

- 破坏性变更
- 数据库结构重大修改
- 移除旧功能
- 核心架构重构

## 示例流程

### 场景：修复一个 bug

```bash
# 创建分支
git checkout -b fix/login-error

# 修复代码...
git commit -m "fix: resolve login error when token expires"
git push origin fix/login-error
```

然后创建 PR → 添加 `patch` 标签（或不留标签，默认 patch）→ 合并

结果：8.2.1 → 8.2.2

### 场景：添加新功能

```bash
# 创建分支
git checkout -b feature/dark-mode

# 开发功能...
git commit -m "feat: add dark mode support"
git push origin feature/dark-mode
```

然后创建 PR → 添加 `minor` 标签 → 合并

结果：8.2.1 → 8.3.0

### 场景：重大重构

```bash
# 创建分支
git checkout -b refactor/new-architecture

# 重构代码...
git commit -m "refactor: migrate to new state management"
git push origin refactor/new-architecture
```

然后创建 PR → 添加 `major` 标签 → 合并

结果：8.2.1 → 9.0.0

## 注意事项

### ❌ 不要做的事

1. **不要在功能分支修改版本号**

   ```bash
   # 错误！不要这样做
   npm version 8.3.0
   ```

2. **不要手动打 tag**

   ```bash
   # 错误！不要这样做
   git tag v8.3.0
   git push origin v8.3.0
   ```

3. **不要直接推送到 main**
   ```bash
   # 错误！不要这样做
   git checkout main
   git add .
   git commit -m "some changes"
   git push origin main  # 这会跳过版本管理！
   ```

### ✅ 最佳实践

1. **始终使用 PR 工作流**
   - 所有变更都通过 PR 合并
   - 启用分支保护规则（可选）

2. **使用语义化提交信息**
   - `feat:` - 新功能（对应 minor）
   - `fix:` - Bug 修复（对应 patch）
   - `docs:` - 文档更新（对应 patch）
   - `refactor:` - 重构（视情况而定）
   - `BREAKING CHANGE:` - 破坏性变更（对应 major）

3. **PR 标签策略**
   - 日常开发：用 `patch` 或不加标签
   - Sprint 功能：用 `minor`
   - 架构升级：用 `major`

## 故障排查

### Workflow 失败怎么办？

#### 1. Auto Version Bump 失败

检查 GitHub Actions 日志：

- 是否有权限问题？
- package.json 格式是否正确？
- 是否有未解决的冲突？

#### 2. Release 构建失败

- 检查版本号是否一致（应该一致，因为自动管理）
- 检查构建脚本是否正常
- 检查 GitHub Secrets 是否配置

### 手动修复（紧急情况）

如果自动化流程出现问题，可以手动修复：

```bash
# 1. 切换到 main
git checkout main
git pull origin main

# 2. 手动更新版本（仅紧急情况）
npm version 8.3.0 --no-git-tag-version

# 3. 提交并打 tag
git add package.json package-lock.json
git commit -m "chore(release): manually bump version to 8.3.0"
git tag v8.3.0

# 4. 推送
git push origin main
git push origin v8.3.0
```

⚠️ **警告**：手动操作应该仅在自动化失效时使用！

## 配置说明

### 需要的 GitHub Secrets

- `GITHUB_TOKEN`：自动提供，用于推送代码和创建 tag
- `HOMEBREW_TAP_TOKEN`：可选，用于更新 Homebrew Tap（Personal Access Token）

### Workflow 文件

- `.github/workflows/auto-version-bump.yml`：PR 合并后自动升级版本
- `.github/workflows/release.yml`：tag 创建后构建 Release

## 总结

```
┌─────────────────────────────────────────────────────────────┐
│                    开发流程（简化版）                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. 创建分支      git checkout -b feature/xxx              │
│         │                                                   │
│         ▼                                                   │
│   2. 开发代码      git commit / git push                    │
│         │                                                   │
│         ▼                                                   │
│   3. 创建 PR       GitHub UI + 标签 (major/minor/patch)     │
│         │                                                   │
│         ▼                                                   │
│   4. 代码审查      Review → Approve → Merge                 │
│         │                                                   │
│         ▼                                                   │
│   5. 自动版本升级  [Auto] package.json + tag                │
│         │                                                   │
│         ▼                                                   │
│   6. 自动构建      [Auto] Build → Release → Homebrew        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**记住**：你的唯一操作是创建 PR 并选择标签，其余全部自动化！
