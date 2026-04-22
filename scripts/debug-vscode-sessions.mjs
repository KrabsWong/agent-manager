#!/usr/bin/env node
/**
 * Debug script to inspect VS Code Extension session data
 * Usage: node scripts/debug-vscode-sessions.mjs [session-id]
 *
 * Example: node scripts/debug-vscode-sessions.mjs 019d4c9959727fffa1c51af7dae0525d
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VSCODE_STORAGE_PATH = path.join(
  os.homedir(),
  'Library/Application Support/Code/User/workspaceStorage'
);

const targetSessionId = process.argv[2];

function findSessionFiles() {
  if (!fs.existsSync(VSCODE_STORAGE_PATH)) {
    console.log('❌ VS Code storage path not found:', VSCODE_STORAGE_PATH);
    return [];
  }

  const sessions = [];

  const entries = fs.readdirSync(VSCODE_STORAGE_PATH, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const hash = entry.name;
    const workspaceJsonPath = path.join(VSCODE_STORAGE_PATH, hash, 'workspace.json');
    let workspacePath = null;

    if (fs.existsSync(workspaceJsonPath)) {
      try {
        const content = fs.readFileSync(workspaceJsonPath, 'utf-8');
        const data = JSON.parse(content);
        workspacePath = data.path || data.folder || null;
      } catch {
        // Ignore parse errors
      }
    }

    // Check for gongfeng copilot
    const gongfengPath = path.join(
      VSCODE_STORAGE_PATH,
      hash,
      'gongfeng.gongfeng-copilot',
      'gongfeng-chat'
    );

    if (fs.existsSync(gongfengPath)) {
      const historyFile = path.join(gongfengPath, 'chat_history_list.json');

      if (fs.existsSync(historyFile)) {
        // Find session files
        const files = fs.readdirSync(gongfengPath);
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'chat_history_list.json' && file !== 'chat_tab_list.json') {
            const sessionId = file.replace('.json', '');
            sessions.push({
              workspaceHash: hash,
              workspacePath,
              sessionFile: path.join(gongfengPath, file),
              historyFile,
              sessionId,
            });
          }
        }
      }
    }
  }

  return sessions;
}

function inspectSession(sessionFile, sessionId) {
  console.log('\n========================================');
  console.log(`🔍 Session: ${sessionId}`);
  console.log('========================================\n');

  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const data = JSON.parse(content);

    console.log('📋 Basic Info:');
    console.log(`   Session ID: ${data.sessionId}`);
    console.log(`   Session Name: ${data.sessionName}`);
    console.log(`   Model: ${data.model || 'N/A'}`);
    console.log(`   Chat Mode: ${data.chatMode || 'N/A'}`);
    console.log(`   Messages Count: ${data.messages?.length || 0}`);

    console.log('\n📨 Messages:\n');

    if (data.messages && Array.isArray(data.messages)) {
      data.messages.forEach((msg, index) => {
        const role = msg.role || 'unknown';
        const roleEmoji = role === 'user' ? '👤' : role === 'assistant' ? '🤖' : role === 'system' ? '⚙️' : role === 'tool' ? '🔧' : '❓';

        console.log(`${roleEmoji} [${index + 1}] ${role.toUpperCase()}`);
        console.log(`   Timestamp: ${msg.createdAt || 'N/A'}`);
        console.log(`   Model: ${msg.model || 'N/A'}`);

        // Show content preview (first 150 chars)
        const contentPreview = (msg.content || '').substring(0, 150).replace(/\n/g, ' ');
        console.log(`   Content: ${contentPreview}${(msg.content || '').length > 150 ? '...' : ''}`);

        // Check for tool_calls
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          console.log(`   Tool Calls: ${msg.tool_calls.length}`);
          msg.tool_calls.forEach((tc, tcIndex) => {
            console.log(`      [${tcIndex + 1}] ${tc.name || 'unnamed'}`);
          });
        }

        // Check for tool_call_id
        if (msg.tool_call_id) {
          console.log(`   Tool Call ID: ${msg.tool_call_id}`);
        }

        // Check for additional fields
        const additionalFields = Object.keys(msg).filter(
          k => !['role', 'content', 'createdAt', 'model', 'cost', 'tool_calls', 'tool_call_id', 'name'].includes(k)
        );
        if (additionalFields.length > 0) {
          console.log(`   Additional Fields: ${additionalFields.join(', ')}`);
        }

        console.log(''); // Empty line between messages
      });
    }

    // Show conversation flow summary
    console.log('\n📊 Conversation Flow:');
    const flow = data.messages?.map((m) => m.role?.[0]?.toUpperCase() || '?').join(' → ');
    console.log(`   ${flow}`);

    // Show raw JSON of first and last message for detailed inspection
    if (data.messages && data.messages.length > 0) {
      console.log('\n📝 First Message (Raw JSON):');
      console.log(JSON.stringify(data.messages[0], null, 2).substring(0, 800));

      if (data.messages.length > 1) {
        console.log('\n📝 Last Message (Raw JSON):');
        console.log(JSON.stringify(data.messages[data.messages.length - 1], null, 2).substring(0, 800));
      }
    }

  } catch (error) {
    console.error('❌ Error reading session file:', error);
  }
}

// Main
console.log('🔧 VS Code Extension Session Debugger\n');
console.log('Storage Path:', VSCODE_STORAGE_PATH);

if (targetSessionId) {
  console.log(`\nTarget Session ID: ${targetSessionId}`);
}

const sessions = findSessionFiles();
console.log(`\n📦 Found ${sessions.length} session(s)\n`);

if (sessions.length === 0) {
  console.log('❌ No sessions found. Make sure you have:');
  console.log('   1. VS Code installed');
  console.log('   2. Gongfeng Copilot extension installed');
  console.log('   3. At least one conversation in the extension');
  process.exit(0);
}

// If specific session ID provided, inspect only that one
if (targetSessionId) {
  const targetSession = sessions.find(s => s.sessionId === targetSessionId);
  if (targetSession) {
    inspectSession(targetSession.sessionFile, targetSession.sessionId);
  } else {
    console.log(`❌ Session ${targetSessionId} not found!`);
    console.log('\nAvailable sessions:');
    sessions.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.sessionId}`);
    });
  }
} else {
  // Show list of sessions
  console.log('--- Available Sessions ---\n');
  sessions.forEach((session, index) => {
    console.log(`[${index + 1}] ${session.sessionId}`);
    console.log(`    Workspace: ${session.workspacePath || session.workspaceHash}`);
  });

  // Inspect the most recent session
  console.log('\n\n🔍 Inspecting most recent session...');
  const mostRecent = sessions[sessions.length - 1];
  inspectSession(mostRecent.sessionFile, mostRecent.sessionId);

  console.log('\n\n💡 Tip: Run with a session ID to inspect a specific session:');
  console.log(`   node scripts/debug-vscode-sessions.mjs ${sessions[0].sessionId}`);
}
