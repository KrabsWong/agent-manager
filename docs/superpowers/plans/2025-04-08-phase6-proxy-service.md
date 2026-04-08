# Phase 6: 代理服务实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 实现 HTTP 代理服务器，支持熔断器、故障转移和用量统计

**Architecture:**

- **Proxy Server**: Express-based HTTP 代理，拦截并转发 API 请求
- **Circuit Breaker**: 熔断器模式，防止级联故障
- **Failover Queue**: 故障转移队列，自动切换备用 Provider
- **Usage Tracker**: 实时用量统计，存储到数据库
- **Dashboard**: 可视化控制面板，显示状态和图表

**Tech Stack:**

- 后端: Express, http-proxy-middleware, better-sqlite3
- 前端: React + Recharts (图表) + TanStack Query

---

## 任务列表

### Task 1: 安装代理服务依赖

- 安装 express, http-proxy-middleware, recharts
- 安装 @types/express

### Task 2: 创建代理配置适配器

- electron/services/proxy/config-adapter.ts
- 管理应用配置中的代理设置

### Task 3: 创建熔断器 (Circuit Breaker)

- electron/services/proxy/circuit-breaker.ts
- 实现 CLOSED/OPEN/HALF_OPEN 状态机

### Task 4: 创建故障转移队列

- electron/services/proxy/failover.ts
- 管理 Provider 故障转移逻辑

### Task 5: 创建用量统计服务

- electron/services/proxy/usage-tracker.ts
- 记录请求日志和日统计

### Task 6: 创建 Express 代理服务器

- electron/services/proxy/server.ts
- HTTP 代理核心，集成熔断器和故障转移

### Task 7: 创建 IPC Handlers

- electron/handlers/proxy.ts
- 注册所有代理相关 IPC 通道

### Task 8: 前端 API 层扩展

- src/lib/api/index.ts
- 添加 proxyApi 对象

### Task 9: 创建 TanStack Query Hooks

- src/hooks/useProxy.ts
- React hooks 用于代理状态和用量数据

### Task 10: 创建用量图表组件

- src/components/proxy/UsageChart.tsx
- 使用 Recharts 显示用量趋势

### Task 11: 创建状态卡片组件

- src/components/proxy/StatusCard.tsx
- 显示代理状态、熔断器状态

### Task 12: 创建代理控制面板页面

- src/pages/Proxy/index.tsx
- 完整的代理管理 UI

### Task 13: 注册路由和导航

- src/lib/router.tsx
- src/components/Sidebar.tsx

### Task 14: 测试和验证

- 运行 TypeScript 检查
- 运行开发服务器测试

---

**总任务数: 14**
**预计开发时间: 2-3 小时**
