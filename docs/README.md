# Yes Sessions 文档中心

## 📋 核心文档

### 🚀 迁移指南（必读）

- **[MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)** - **完整的迁移实施指南**
  - 技术选型决策
  - 最终架构设计
  - 性能基准数据
  - 实施路线图（5周计划）
  - 风险评估与应对
  
  **👉 开始重构前，请先阅读此文档**

---

## 📚 技术参考文档

### 1. 架构与部署

- **[packaging-deployment-guide.md](packaging-deployment-guide.md)** - 打包与部署完整方案
  - Neutralinojs + Rust 微服务架构
  - 进程模型详解
  - 跨平台打包方案
  - 开发环境设置

### 2. 存储方案

- **[storage-solution-design.md](storage-solution-design.md)** - 存储方案设计
  - Neutralino.storage（系统配置）
  - Rust rusqlite（OpenCode 数据）
  - 窗口位置自动保存
  - 完整实现代码

### 3. 性能对比

- **[rust-performance-comparison.md](rust-performance-comparison.md)** - Rust vs Electron 性能对比
  - 查询性能基准测试
  - 内存占用对比
  - 启动性能分析
  - HTTP 通信开销

### 4. 终端集成

- **[rust-terminal-integration.md](rust-terminal-integration.md)** - Rust 终端集成方案
  - portable-pty 集成
  - WebSocket 数据流
  - 前端 xterm.js 集成
  - 性能优化方案

---

## 📁 历史文档（参考）

以下文档记录了项目发布和管理相关信息，供参考：

- **[HOMEBREW_CASK_GUIDE.md](HOMEBREW_CASK_GUIDE.md)** - Homebrew 发布指南
- **[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)** - 版本管理文档

---

## 🎯 快速开始

### 开发者

1. 阅读 **[MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)** 了解完整方案
2. 参考 **[packaging-deployment-guide.md](packaging-deployment-guide.md)** 搭建开发环境
3. 查看具体模块实现文档（存储、终端等）

### 项目负责人

1. 阅读 **[MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)** 第 1-3 章（决策、架构）
2. 查看第 6 章（实施路线图）制定计划
3. 评估第 7 章（风险评估）

---

## 📊 文档统计

```
核心文档: 1 个
技术参考: 4 个
历史文档: 2 个
─────────────────
总计: 7 个文档
```

---

## 📝 文档维护

- **核心文档**: 随项目进展更新
- **技术参考**: 实施过程中补充细节
- **历史文档**: 仅供参考，不更新

---

**最后更新**: 2026-05-10