# Phase 8 国际化优化计划（归档）

本文原为早期 i18n 优化计划，已经不再作为当前实现依据。

当前 i18n 关键事实：

- 运行时翻译资源在 `src/lib/i18n/index.ts` 的内联对象。
- `src/locales/*.json` 只是备份/参考。
- 新增 UI 文案必须同步更新 `enTranslations` 和 `zhTranslations`。

当前事实来源请查看 `AGENTS.md`、`README.md` 和 `docs/PROJECT_ISSUES.md`。
