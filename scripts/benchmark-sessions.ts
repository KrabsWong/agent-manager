import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { claudeSessionService } from '@electron/services/session/claude';
import { codebuddySessionService } from '@electron/services/session/codebuddy';
import { codexSessionService } from '@electron/services/session/codex';
import { opencodeSessionService } from '@electron/services/session/opencode';
import { groupMessagesIntoTurnsWithCount } from '@/components/sessions/ConversationView/utils';
import { ConversationView } from '@/components/sessions/ConversationView';
import '@/lib/i18n';
import type { AppType, Session, SessionDetail } from '@/types';

type Service = {
  getAllSessions: () => Promise<Session[]> | Session[];
  getSessionDetail: (sessionId: string) => Promise<SessionDetail | null> | SessionDetail | null;
  isAvailable: () => boolean;
};

const services: Array<{ appType: AppType; service: Service }> = [
  { appType: 'claude', service: claudeSessionService },
  { appType: 'codex', service: codexSessionService },
  { appType: 'opencode', service: opencodeSessionService },
  { appType: 'codebuddy', service: codebuddySessionService },
];

function now(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

async function measure<T>(fn: () => Promise<T> | T): Promise<{ durationMs: number; value: T }> {
  const startedAt = now();
  const value = await fn();
  return { durationMs: now() - startedAt, value };
}

function setupDom(): HTMLDivElement {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    MutationObserver: dom.window.MutationObserver,
    navigator: dom.window.navigator,
    getComputedStyle: dom.window.getComputedStyle,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  });

  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const scrollContainer = document.createElement('div');
  scrollContainer.id = 'conversation-scroll-container';
  scrollContainer.style.height = '800px';
  scrollContainer.style.overflowY = 'auto';
  scrollContainer.scrollTo = () => {};
  Object.defineProperty(scrollContainer, 'clientHeight', { value: 800, configurable: true });
  scrollContainer.getBoundingClientRect = () =>
    ({
      width: 1200,
      height: 800,
      top: 0,
      right: 1200,
      bottom: 800,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(scrollContainer);

  return scrollContainer;
}

function renderConversation(
  detail: SessionDetail,
  appType: AppType
): { durationMs: number; root: Root } {
  const scrollContainer = setupDom();
  const host = document.createElement('div');
  scrollContainer.appendChild(host);
  const root = createRoot(host);

  const startedAt = now();
  act(() => {
    root.render(React.createElement(ConversationView, { messages: detail.messages, appType }));
  });

  return { durationMs: now() - startedAt, root };
}

function getCandidates(sessions: Session[]): Session[] {
  const byId = new Map<string, Session>();
  for (const session of sessions.slice(0, 5)) {
    byId.set(session.id, session);
  }
  for (const session of [...sessions].sort((a, b) => b.messageCount - a.messageCount).slice(0, 5)) {
    byId.set(session.id, session);
  }
  return [...byId.values()];
}

async function run(): Promise<void> {
  const appFilter = process.argv[2] as AppType | undefined;
  console.log('Yes Sessions performance benchmark');
  console.log(`timestamp=${new Date().toISOString()}`);
  if (appFilter) {
    console.log(`filter=${appFilter}`);
  }

  for (const { appType, service } of services) {
    if (appFilter && appType !== appFilter) {
      continue;
    }

    if (!service.isAvailable()) {
      console.log(`\n[${appType}] unavailable`);
      continue;
    }

    const list = await measure(() => service.getAllSessions());
    const sessions = list.value;
    console.log(
      `\n[${appType}] list: ${list.durationMs.toFixed(1)}ms, sessions=${sessions.length}, messages=${sessions.reduce(
        (sum, session) => sum + session.messageCount,
        0
      )}`
    );

    for (const session of getCandidates(sessions)) {
      const detail = await measure(() => service.getSessionDetail(session.id));
      const value = detail.value;
      if (!value) {
        console.log(`  detail ${session.id}: ${detail.durationMs.toFixed(1)}ms, null`);
        continue;
      }

      const group = measure(() => groupMessagesIntoTurnsWithCount(value.messages, appType));
      const grouped = await group;
      const render = renderConversation(value, appType);
      act(() => {
        render.root.unmount();
      });

      console.log(
        `  detail ${session.id}: load=${detail.durationMs.toFixed(1)}ms, group=${grouped.durationMs.toFixed(
          1
        )}ms, render=${render.durationMs.toFixed(1)}ms, messages=${value.messages.length}, turns=${grouped.value.length}`
      );
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
