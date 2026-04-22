#!/usr/bin/env node
/**
 * Test Mermaid rendering
 * Usage: node scripts/test-mermaid.mjs
 */

import mermaid from 'mermaid';
import { JSDOM } from 'jsdom';

// Setup DOM environment for Mermaid
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

const testDiagrams = [
  {
    name: 'Simple Flowchart',
    code: `
graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]
    `,
  },
  {
    name: 'Sequence Diagram',
    code: `
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
    `,
  },
  {
    name: 'Invalid Syntax',
    code: `
this is not valid mermaid
    `,
  },
];

async function testMermaid() {
  console.log('🧪 Testing Mermaid Rendering\n');

  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
  });

  for (const test of testDiagrams) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log('─'.repeat(50));

    try {
      const id = `test-${Math.random().toString(36).substr(2, 9)}`;

      // Render with timeout
      const renderPromise = mermaid.render(id, test.code.trim());
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 5s')), 5000);
      });

      const { svg } = await Promise.race([renderPromise, timeoutPromise]);

      console.log('✅ Success!');
      console.log(`   SVG length: ${svg.length} chars`);
    } catch (err) {
      console.log('❌ Error:', err.message);
    }
  }

  console.log('\n✨ Tests completed');
}

testMermaid();
