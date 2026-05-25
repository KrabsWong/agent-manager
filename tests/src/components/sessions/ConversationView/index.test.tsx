import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionMessage } from '@/types/session';
import { ConversationView } from '@/components/sessions/ConversationView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'sessions.you': 'You',
        'sessions.caveat': 'Caveat',
        'sessions.pasted': 'Pasted',
        'sessions.command': 'Command',
        'sessions.commandOutput': 'Command Output',
        'sessions.system': 'System',
        'sessions.model': 'Model',
        'sessions.input': 'Input',
        'sessions.output': 'Output',
        'sessions.thinking': 'Thinking',
        'sessions.expand': 'Expand',
        'sessions.collapse': 'Collapse',
      };
      return translations[key] || defaultValue || key;
    },
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const timestamp = '2024-01-02T03:04:00+08:00';

function message(overrides: Partial<SessionMessage>): SessionMessage {
  return {
    type: 'user',
    timestamp,
    ...overrides,
  };
}

function render(element: React.ReactElement): { container: HTMLDivElement; root: Root } {
  const scrollContainer = document.createElement('div');
  scrollContainer.id = 'conversation-scroll-container';
  document.body.appendChild(scrollContainer);

  const container = document.createElement('div');
  scrollContainer.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

function click(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function unmount(root: Root): void {
  act(() => {
    root.unmount();
  });
}

describe('ConversationView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders system, user, and assistant messages', () => {
    const messages: SessionMessage[] = [
      message({ type: 'system', content: 'System reminder' }),
      message({ type: 'user', content: 'Summarize this repo' }),
      message({ type: 'assistant', content: 'Here is the summary.' }),
    ];

    const { container, root } = render(
      <ConversationView messages={messages} appType="codebuddy" />
    );

    expect(container.textContent).toContain('System reminder');
    expect(container.textContent).toContain('You');
    expect(container.textContent).toContain('Summarize this repo');
    expect(container.textContent).toContain('Here is the summary.');
    unmount(root);
  });

  it('renders tool calls and expands input and output details', () => {
    const messages: SessionMessage[] = [
      message({ type: 'user', content: 'Read package metadata' }),
      message({
        type: 'tool_use',
        tool_name: 'read',
        callId: 'read-1',
        tool_input: { file_path: '/repo/package.json' },
      }),
      message({
        type: 'tool_result',
        tool_name: 'read',
        callId: 'read-1',
        tool_output: { output: '{ "name": "yes-sessions" }' },
      }),
      message({ type: 'assistant', content: 'The package is yes-sessions.' }),
    ];

    const { container, root } = render(
      <ConversationView messages={messages} appType="codebuddy" />
    );

    expect(container.textContent).toContain('Read File');
    expect(container.textContent).toContain('package.json');
    expect(container.textContent).not.toContain('file_path:');
    expect(container.textContent).not.toContain('"name": "yes-sessions"');

    const toolButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Read File')
    );
    expect(toolButton).toBeTruthy();
    click(toolButton!);

    expect(container.textContent).toContain('file_path:');
    expect(container.textContent).toContain('/repo/package.json');
    expect(container.textContent).toContain('"name": "yes-sessions"');
    expect(container.textContent).toContain('The package is yes-sessions.');
    unmount(root);
  });
});
