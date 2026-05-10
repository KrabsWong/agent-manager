/**
 * Rust Backend Adapter Test
 *
 * This file demonstrates how to test the Rust backend adapter
 */

import { RustBackendAdapter } from './adapters/rust-adapter';

async function testRustAdapter() {
  console.log('[Test] Starting Rust Backend Adapter test...');

  const adapter = new RustBackendAdapter();

  // Test 1: Health check
  console.log('\n[1/5] Testing health check...');
  const isHealthy = await adapter.healthCheck();
  console.log('Health check:', isHealthy ? '✅ PASSED' : '❌ FAILED');

  if (!isHealthy) {
    console.error('[Test] Rust service is not running!');
    console.error('[Test] Please start it with: cd rust-service && cargo run');
    return;
  }

  // Test 2: Get app version
  console.log('\n[2/5] Testing app.getVersion...');
  try {
    const version = await adapter.app.getVersion();
    console.log('Version:', version, '✅ PASSED');
  } catch (error) {
    console.error('Version test failed:', error);
  }

  // Test 3: Get settings
  console.log('\n[3/5] Testing settings.get...');
  try {
    const settings = await adapter.settings.get();
    console.log('Settings:', settings, '✅ PASSED');
  } catch (error) {
    console.error('Settings test failed:', error);
  }

  // Test 4: Update settings
  console.log('\n[4/5] Testing settings.update...');
  try {
    await adapter.settings.update({ theme: 'dark' });
    console.log('Settings updated ✅ PASSED');
  } catch (error) {
    console.error('Settings update test failed:', error);
  }

  // Test 5: Create terminal
  console.log('\n[5/5] Testing pty.create...');
  try {
    const terminal = await adapter.pty.create('test-session-123', { cwd: '~' });
    console.log('Terminal created:', terminal, '✅ PASSED');
  } catch (error) {
    console.error('Terminal test failed:', error);
  }

  console.log('\n[Test] All tests completed!');
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for manual testing
  (window as unknown as { testRustAdapter: () => Promise<void> }).testRustAdapter = testRustAdapter;
  console.log('[Test] testRustAdapter() is available in window');
}

export { testRustAdapter };