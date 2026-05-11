# Rust Backend Adapter 使用指南

## 概述

Rust 后端适配器允许前端通过 HTTP API 调用 Rust 微服务。

## 快速开始

### 1. 启动 Rust 微服务

```bash
cd rust-service
cargo run
```

服务将在 `http://localhost:3000` 启动。

### 2. 切换到 Rust 后端

```typescript
import { switchBackend, getApi } from '@/lib/api';

// 切换到 Rust 后端
switchBackend('rust');

// 使用 API
const sessions = await getApi().sessions.getAll('opencode');
console.log(sessions);
```

### 3. 测试连接

```typescript
import { RustBackendAdapter } from '@/services/api/adapters/rust-adapter';

const adapter = new RustBackendAdapter();
const isHealthy = await adapter.healthCheck();

if (isHealthy) {
  console.log('✅ Rust service is running');
} else {
  console.error('❌ Rust service is not available');
}
```

## 完整示例

```typescript
// src/test-rust-backend.ts
import { switchBackend, getApi } from '@/lib/api';

async function testRustBackend() {
  // 1. 切换后端
  switchBackend('rust');

  const api = getApi();

  // 2. 测试健康检查
  console.log('Testing health...');
  const version = await api.app.getVersion();
  console.log('Version:', version);

  // 3. 获取会话列表
  console.log('Fetching sessions...');
  const sessions = await api.sessions.getAll('opencode');
  console.log('Sessions:', sessions);

  // 4. 获取设置
  console.log('Fetching settings...');
  const settings = await api.settings.get();
  console.log('Settings:', settings);

  // 5. 更新设置
  console.log('Updating settings...');
  await api.settings.update({ theme: 'dark' });
  console.log('Settings updated!');

  // 6. 创建终端（需要 WebSocket 支持）
  console.log('Creating terminal...');
  const terminal = await api.pty.create('test-123', { cwd: '~' });
  console.log('Terminal created:', terminal);
}

testRustBackend().catch(console.error);
```

## 功能状态

| 功能 | 状态 | 说明 |
|------|------|------|
| **HTTP API** | ✅ | 完全支持 |
| sessions.getAll | ✅ | 已实现 |
| sessions.getDetail | ⚠️ | 基础实现 |
| settings.get | ✅ | 已实现 |
| settings.update | ✅ | 已实现 |
| app.getVersion | ✅ | 已实现 |
| pty.create | ✅ | 已实现 |
| **WebSocket** | ⚠️ | 待实现 |
| pty 数据流 | ⚠️ | 需要 WebSocket |
| git 实时监听 | ⚠️ | 需要 WebSocket |

## 错误处理

```typescript
try {
  const sessions = await getApi().sessions.getAll('opencode');
} catch (error) {
  if (error.message.includes('HTTP')) {
    console.error('Rust service error:', error);
  }
}
```

## 开发调试

### 查看当前后端

```typescript
import { getCurrentBackend } from '@/lib/api';

console.log('Current backend:', getCurrentBackend());
// Output: 'rust' | 'neutralino'
```

### Rust 服务日志

```bash
# 查看 Rust 服务日志
cd rust-service
RUST_LOG=info cargo run
```

## 注意事项

1. **服务依赖**: 使用 Rust 后端前，必须启动 Rust 微服务
2. **WebSocket**: 终端实时通信需要 WebSocket 支持（待实现）
3. **缓存**: 设置数据在内存中缓存，减少 HTTP 请求

## 下一步

- [ ] 实现 WebSocket 实时通信
- [ ] 完善 OpenCode 会话查询
- [ ] 添加 Git 文件监听
- [ ] 性能优化和缓存策略

---

**最后更新**: 2026-05-11  
**版本**: v1.1
