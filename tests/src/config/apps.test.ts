import { describe, expect, it } from 'vitest';
import {
  APP_COLORS,
  APP_LABELS,
  APP_ORDER,
  APP_SESSION_SUPPORT,
  APP_WEBSITES,
  DEFAULT_APP,
  isAppSupported,
} from '@/config/apps';
import type { AppType } from '@/types';

describe('app configuration', () => {
  it('keeps every app config record aligned with APP_ORDER', () => {
    const orderedApps = [...APP_ORDER].sort();
    const records: Array<Record<AppType, unknown>> = [
      APP_LABELS,
      APP_COLORS,
      APP_WEBSITES,
      APP_SESSION_SUPPORT,
    ];

    for (const record of records) {
      expect(Object.keys(record).sort()).toEqual(orderedApps);
    }
  });

  it('uses the first ordered app as the default app', () => {
    expect(DEFAULT_APP).toBe(APP_ORDER[0]);
  });

  it('derives support flags from detailed session support metadata', () => {
    for (const app of APP_ORDER) {
      expect(isAppSupported(app)).toBe(APP_SESSION_SUPPORT[app].supported);
    }
  });
});
