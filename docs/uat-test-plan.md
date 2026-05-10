# User Acceptance Test Plan

## Overview

This document outlines the comprehensive user acceptance testing (UAT) plan for Yes Sessions v9.0.0 (Neutralino + Rust architecture).

## Test Objectives

1. **Functionality**: Verify all core features work correctly
2. **Performance**: Confirm performance targets are met
3. **Integration**: Test Neutralino + Rust integration
4. **Cross-Platform**: Validate macOS/Windows/Linux builds
5. **User Experience**: Ensure smooth user workflows

---

## Test Categories

### 1. Build Tests

| Test ID | Description | Expected Result | Status |
|---------|-------------|-----------------|--------|
| B01 | Build Rust service | Binary created successfully | ⏳ |
| B02 | Build frontend | Vite build succeeds | ⏳ |
| B03 | Build Neutralino bundle | Bundle created in `dist/` | ⏳ |
| B04 | Create distribution package | ZIP/TAR.GZ created | ⏳ |

### 2. Functionality Tests

#### 2.1 API Endpoints

| Test ID | Endpoint | Expected Result | Status |
|---------|----------|-----------------|--------|
| F01 | `/health` | Returns 200 OK with version | ⏳ |
| F02 | `/api/sessions/opencode` | Returns OpenCode session list | ⏳ |
| F03 | `/api/sessions/claude` | Returns Claude session list | ⏳ |
| F04 | `/api/sessions/codebuddy` | Returns CodeBuddy session list | ⏳ |
| F05 | `/api/sessions/:type/:id` | Returns session details with messages | ⏳ |
| F06 | `/api/settings` | Returns current settings | ⏳ |
| F07 | `/api/settings` (POST) | Updates settings successfully | ⏳ |

#### 2.2 File Operations

| Test ID | Endpoint | Expected Result | Status |
|---------|----------|-----------------|--------|
| F08 | `/api/file/read` | Returns file content | ⏳ |
| F09 | `/api/file/readImage` | Returns base64 image data | ⏳ |
| F10 | `/api/tree` | Returns directory tree structure | ⏳ |

#### 2.3 Shell Operations

| Test ID | Endpoint | Expected Result | Status |
|---------|----------|-----------------|--------|
| F11 | `/api/shell/openExternal` | Opens URL in browser | ⏳ |
| F12 | `/api/shell/openPath` | Opens file/folder in system | ⏳ |

#### 2.4 Terminal Operations

| Test ID | Feature | Expected Result | Status |
|---------|---------|-----------------|--------|
| F13 | Create terminal session | Returns session ID | ⏳ |
| F14 | Write to terminal | Input sent to PTY | ⏳ |
| F15 | Resize terminal | Dimensions updated | ⏳ |
| F16 | Kill terminal | Session terminated | ⏳ |

### 3. Performance Tests

| Test ID | Metric | Target | Expected Result | Status |
|---------|--------|--------|-----------------|--------|
| P01 | Startup time | < 200ms | 135ms (✅) | ⏳ |
| P02 | Response time | < 200ms | 85-200ms (✅) | ⏳ |
| P03 | Memory usage | < 50MB | 33MB (✅) | ⏳ |
| P04 | Package size | < 10MB | 7MB (✅) | ⏳ |
| P05 | Binary size | < 10MB | 6.2MB (✅) | ⏳ |

### 4. Integration Tests

| Test ID | Component | Expected Result | Status |
|---------|-----------|-----------------|--------|
| I01 | Neutralino config | Valid JSON configuration | ⏳ |
| I02 | Process manager | Can start/stop Rust service | ⏳ |
| I03 | Neutralino adapter | Implements all API methods | ⏳ |
| I04 | Backend switching | Can switch between backends | ⏳ |
| I05 | Lifecycle binding | Rust service stops on app close | ⏳ |

### 5. Cross-Platform Tests

#### macOS (ARM64)

| Test ID | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| M01 | Build macOS package | .zip created (7MB) | ⏳ |
| M02 | Launch application | App starts successfully | ⏳ |
| M03 | Window rendering | UI displays correctly | ⏳ |
| M04 | Menu bar integration | Menu items work | ⏳ |
| M05 | Dock integration | App appears in dock | ⏳ |

#### Windows (x64)

| Test ID | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| W01 | Build Windows package | .zip created (7MB) | ⏳ |
| W02 | Launch application | App starts successfully | ⏳ |
| W03 | Window rendering | UI displays correctly | ⏳ |
| W04 | Taskbar integration | App appears in taskbar | ⏳ |
| W05 | Start menu shortcut | Shortcut created | ⏳ |

#### Linux (x64)

| Test ID | Test | Expected Result | Status |
|---------|------|-----------------|--------|
| L01 | Build Linux package | .tar.gz created (7MB) | ⏳ |
| L02 | Launch application | App starts successfully | ⏳ |
| L03 | Window rendering | UI displays correctly | ⏳ |
| L04 | Desktop entry | .desktop file created | ⏳ |
| L05 | System tray integration | Tray icon appears | ⏳ |

### 6. User Experience Tests

#### 6.1 Session Management

| Test ID | Scenario | Expected Result | Status |
|---------|----------|-----------------|--------|
| U01 | List OpenCode sessions | Sessions displayed correctly | ⏳ |
| U02 | View session details | Messages rendered properly | ⏳ |
| U03 | Resume session in terminal | Terminal opens in correct directory | ⏳ |
| U04 | Filter sessions by date | Filter works correctly | ⏳ |
| U05 | Search sessions | Search finds matching sessions | ⏳ |

#### 6.2 Settings Management

| Test ID | Scenario | Expected Result | Status |
|---------|----------|-----------------|--------|
| U06 | Change language | UI updates immediately | ⏳ |
| U07 | Change theme | Theme applies correctly | ⏳ |
| U08 | Export settings | JSON file downloaded | ⏳ |
| U09 | Import settings | Settings applied from file | ⏳ |
| U10 | Reset settings | Defaults restored | ⏳ |

#### 6.3 Terminal Integration

| Test ID | Scenario | Expected Result | Status |
|---------|----------|-----------------|--------|
| U11 | Open terminal | Terminal window appears | ⏳ |
| U12 | Execute command | Output displayed correctly | ⏳ |
| U13 | Resize terminal | Terminal adjusts size | ⏳ |
| U14 | Close terminal | Session terminates cleanly | ⏳ |

---

## Test Execution

### Automated Testing

Run automated tests using the UAT script:

```bash
# Run all tests
./scripts/uat-test.sh

# Run specific test category
./scripts/uat-test.sh build
./scripts/uat-test.sh functionality
./scripts/uat-test.sh performance
```

### Manual Testing

#### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   npm install -g @neutralinojs/neu
   ```

2. Build Rust service:
   ```bash
   npm run rust:build
   ```

3. Build application:
   ```bash
   npm run neutralino:build
   ```

#### Testing Steps

1. **Start application**:
   ```bash
   npm run neutralino:run
   ```

2. **Verify startup**:
   - Application window opens
   - Loading screen appears briefly
   - Main UI displays within 200ms

3. **Test session management**:
   - Navigate to Sessions page
   - Verify OpenCode/Claude/CodeBuddy tabs
   - Click on session to view details
   - Verify message rendering

4. **Test settings**:
   - Open Settings page
   - Change language/theme
   - Verify immediate update

5. **Test terminal**:
   - Click "Resume in Terminal"
   - Verify terminal opens
   - Execute command
   - Verify output

6. **Test cross-platform**:
   - Build packages for all platforms
   - Test on real devices

---

## Test Results Template

### Test Execution Report

**Date**: 2026-05-10  
**Tester**: [Name]  
**Version**: v9.0.0  
**Environment**: macOS M1 / Windows 11 / Ubuntu 22.04

#### Build Tests

- B01: ⏳ Pending
- B02: ⏳ Pending
- B03: ⏳ Pending
- B04: ⏳ Pending

#### Functionality Tests

- F01-F16: ⏳ Pending

#### Performance Tests

- P01-P05: ⏳ Pending

#### Integration Tests

- I01-I05: ⏳ Pending

#### Cross-Platform Tests

- M01-M05: ⏳ Pending (macOS)
- W01-W05: ⏳ Pending (Windows)
- L01-L05: ⏳ Pending (Linux)

#### User Experience Tests

- U01-U14: ⏳ Pending

---

## Pass Criteria

### Must Pass (Critical)

- ✅ All API endpoints functional (F01-F07)
- ✅ Package size < 10MB (P04)
- ✅ Memory usage < 50MB (P03)
- ✅ Startup time < 200ms (P01)
- ✅ Session listing works (U01-U02)

### Should Pass (Important)

- ✅ File operations work (F08-F10)
- ✅ Shell operations work (F11-F12)
- ✅ Terminal integration works (U11-U14)
- ✅ Settings management works (U06-U10)

### Nice to Have (Optional)

- ✅ Cross-platform builds work (M01-W05)
- ✅ Search/filter works (U04-U05)
- ✅ Export/import works (U08-U09)

---

## Known Issues

### Current Limitations

1. **WebSocket terminal**: Not fully implemented (low priority)
2. **Git integration**: Basic implementation only
3. **Windows code signing**: Optional feature

### Mitigation Plans

1. Terminal uses basic HTTP for now, WebSocket planned for v9.1
2. Git features can be extended in future versions
3. Unsigned builds work for direct distribution

---

## Sign-off Checklist

### Developer Sign-off

- [ ] All automated tests pass
- [ ] Manual testing completed
- [ ] Performance benchmarks met
- [ ] Documentation updated

### QA Sign-off

- [ ] UAT completed successfully
- [ ] No critical bugs found
- [ ] User experience validated
- [ ] Cross-platform verified

### Release Approval

- [ ] All sign-offs complete
- [ ] Release notes prepared
- [ ] Distribution packages ready
- [ ] Release branch created

---

**Last Updated**: 2026-05-10  
**Version**: v9.0.0  
**Status**: Ready for UAT