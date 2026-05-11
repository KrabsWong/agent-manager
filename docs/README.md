# Yes Sessions 文档中心

## 📋 核心文档

### 🚀 架构与迁移

- **[NEUTRALINO-MIGRATION-SUMMARY.md](NEUTRALINO-MIGRATION-SUMMARY.md)** - Neutralinojs 迁移总结
  - 迁移结果与性能对比
  - 架构变更说明
  - 功能支持状态

---

## 📚 技术参考文档

### 1. 部署与打包

- **[packaging-deployment-guide.md](packaging-deployment-guide.md)** - 打包与部署完整方案
  - Neutralinojs + Rust 微服务架构
  - 进程模型详解
  - 跨平台打包方案
  - 开发环境设置

- **[neutralino-packaging-guide.md](neutralino-packaging-guide.md)** - Neutralino 打包指南
  - 打包流程详解
  - 配置说明
  - 常见问题

### 2. 后端开发

- **[RUST-ADAPTER-GUIDE.md](RUST-ADAPTER-GUIDE.md)** - Rust 后端适配器使用指南
  - 快速开始
  - API 使用示例
  - 功能状态

- **[rust-terminal-integration.md](rust-terminal-integration.md)** - Rust 终端集成方案
  - portable-pty 集成
  - WebSocket 数据流
  - 前端 xterm.js 集成
  - 性能优化方案

### 3. 存储方案

- **[storage-solution-design.md](storage-solution-design.md)** - 存储方案设计
  - Neutralino.storage（系统配置）
  - Rust rusqlite（OpenCode 数据）
  - 窗口位置自动保存
  - 完整实现代码

---

## 📁 项目管理

- **[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)** - 版本管理文档
  - 自动化版本管理工作流
  - PR 标签使用说明
  
- **[HOMEBREW_CASK_GUIDE.md](HOMEBREW_CASK_GUIDE.md)** - Homebrew 发布指南
  - Cask 配置
  - 发布流程

---

## 🎯 快速开始

### 开发者

1. 阅读 **[NEUTRALINO-MIGRATION-SUMMARY.md](NEUTRALINO-MIGRATION-SUMMARY.md)** 了解架构
2. 参考 **[packaging-deployment-guide.md](packaging-deployment-guide.md)** 搭建开发环境
3. 查看具体模块实现文档（存储、终端等）

### 新功能开发

1. 参考 **[RUST-ADAPTER-GUIDE.md](RUST-ADAPTER-GUIDE.md)** 了解后端 API
2. 查看相关技术文档（终端集成、存储等）
3. 遵循 **[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)** 的版本管理流程

---

## 📊 文档统计

```
架构文档: 1 个
技术参考: 5 个
项目管理: 2 个
─────────────────
总计: 8 个文档
```

---

## 📝 文档维护

- **架构文档**: 随项目进展更新
- **技术参考**: 实施过程中补充细节
- **项目管理**: 流程变更时更新

---

**最后更新**: 2026-05-11
