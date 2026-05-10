# Yes Sessions Backend Service

Rust-based backend service for Yes Sessions application.

## Features

- ✅ HTTP API (Actix-web)
- ✅ SQLite query engine (rusqlite)
- ✅ PTY terminal management (portable-pty)
- ✅ File watcher (notify)
- ✅ WebSocket support (planned)

## Development

### Prerequisites

- Rust 1.70+
- Cargo

### Run

```bash
cd rust-service
cargo run
```

Server will start at `http://localhost:3000`

### Build

```bash
cargo build --release
```

### Test

```bash
cargo test
```

## API Endpoints

### Health Check

```
GET /health
```

### Sessions

```
GET /api/sessions/:appType
GET /api/sessions/:appType/:id
```

### Settings

```
GET /api/settings
POST /api/settings
```

### Terminal

```
POST /api/terminal
```

## Architecture

```
rust-service/
  src/
    main.rs              # Entry point
    api/                 # HTTP endpoints
      mod.rs
      sessions.rs
      settings.rs
      terminal.rs
    storage/             # Database queries
      mod.rs
      opencode.rs
    terminal/            # PTY management
      mod.rs
    watcher/             # File watcher
      mod.rs
```

## Next Steps

1. Implement session detail query
2. Add WebSocket support for terminal output
3. Implement real-time database watcher
4. Add error handling and logging
5. Write unit tests

## License

MIT