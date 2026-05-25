# 开发 Bad Case 记录（归档）

本文原记录早期 CC Switch/Electron 重写过程中的问题，许多示例已经不再符合当前 Yes Sessions 的代码结构。

仍然有效的项目约束已经迁移或保留在：

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `docs/PROJECT_RESEARCH.md`
- `docs/PROJECT_ISSUES.md`

当前特别需要继续遵守的经验：

- i18n 实际运行资源在 `src/lib/i18n/index.ts`，不是 `src/locales/*.json`。
- Electron preload、IPC、主进程 handler 的边界需要通过共享类型和运行时校验维护。
- 历史计划文档不能作为当前功能事实来源。
