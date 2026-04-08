import Database from 'better-sqlite3';
import { AppType } from '@/types';

export interface UsageLog {
  id?: number;
  timestamp: number;
  appType: AppType;
  providerId: string;
  model?: string;
  requestType: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface DailyStats {
  date: string;
  appType: AppType;
  providerId: string;
  model: string;
  requestsCount: number;
  tokensInputTotal: number;
  tokensOutputTotal: number;
  costUsdTotal: number;
}

export class UsageTracker {
  private db: Database.Database | null;

  constructor(db: Database.Database | null) {
    this.db = db;
  }

  logRequest(log: UsageLog): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO proxy_usage_logs (
        timestamp, app_type, provider_id, model, request_type,
        tokens_input, tokens_output, cost_usd, duration_ms, success, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.timestamp,
      log.appType,
      log.providerId,
      log.model ?? null,
      log.requestType,
      log.tokensInput,
      log.tokensOutput,
      log.costUsd,
      log.durationMs,
      log.success ? 1 : 0,
      log.errorMessage ?? null
    );

    this.updateDailyRollup(log);
  }

  private updateDailyRollup(log: UsageLog): void {
    if (!this.db) return;

    const date = new Date(log.timestamp).toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      INSERT INTO usage_daily_rollups (
        date, app_type, provider_id, model, requests_count,
        tokens_input_total, tokens_output_total, cost_usd_total
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(date, app_type, provider_id, model) DO UPDATE SET
        requests_count = requests_count + 1,
        tokens_input_total = tokens_input_total + excluded.tokens_input_total,
        tokens_output_total = tokens_output_total + excluded.tokens_output_total,
        cost_usd_total = cost_usd_total + excluded.cost_usd_total
    `);

    stmt.run(
      date,
      log.appType,
      log.providerId,
      log.model ?? '',
      log.tokensInput,
      log.tokensOutput,
      log.costUsd
    );
  }

  getDailyStats(startDate: string, endDate: string): DailyStats[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM usage_daily_rollups
      WHERE date >= ? AND date <= ?
      ORDER BY date DESC, app_type, provider_id, model
    `);

    const rows = stmt.all(startDate, endDate) as any[];

    return rows.map((row) => ({
      date: row.date,
      appType: row.app_type,
      providerId: row.provider_id,
      model: row.model,
      requestsCount: row.requests_count,
      tokensInputTotal: row.tokens_input_total,
      tokensOutputTotal: row.tokens_output_total,
      costUsdTotal: row.cost_usd_total,
    }));
  }

  getRecentLogs(limit: number = 100): UsageLog[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM proxy_usage_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      appType: row.app_type,
      providerId: row.provider_id,
      model: row.model,
      requestType: row.request_type,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      costUsd: row.cost_usd,
      durationMs: row.duration_ms,
      success: row.success === 1,
      errorMessage: row.error_message,
    }));
  }

  getTodayStats(): { requests: number; costUsd: number } {
    if (!this.db) return { requests: 0, costUsd: 0 };

    const today = new Date().toISOString().split('T')[0];

    const stmt = this.db.prepare(`
      SELECT SUM(requests_count) as requests, SUM(cost_usd_total) as cost_usd
      FROM usage_daily_rollups
      WHERE date = ?
    `);

    const row = stmt.get(today) as any;

    return {
      requests: row?.requests ?? 0,
      costUsd: row?.cost_usd ?? 0,
    };
  }

  getStatsByProvider(
    startDate: string,
    endDate: string
  ): Array<{
    providerId: string;
    requests: number;
    costUsd: number;
  }> {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT provider_id, SUM(requests_count) as requests, SUM(cost_usd_total) as cost_usd
      FROM usage_daily_rollups
      WHERE date >= ? AND date <= ?
      GROUP BY provider_id
      ORDER BY cost_usd DESC
    `);

    const rows = stmt.all(startDate, endDate) as any[];

    return rows.map((row) => ({
      providerId: row.provider_id,
      requests: row.requests,
      costUsd: row.cost_usd,
    }));
  }
}

let instance: UsageTracker | null = null;

export function initializeUsageTracker(db: Database.Database | null): UsageTracker {
  instance = new UsageTracker(db);
  return instance;
}

export function getUsageTracker(): UsageTracker {
  if (!instance) {
    throw new Error('UsageTracker not initialized. Call initializeUsageTracker first.');
  }
  return instance;
}
