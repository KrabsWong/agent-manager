/**
 * Session Service Registry
 *
 * 统一管理各应用类型的 Session 服务
 */

import type { Session, SessionDetail, SessionStats } from '@/types/session';
import type { AppType } from '@/types';

interface SessionService {
  /** 应用类型标识 */
  readonly appType: AppType;

  /** 获取所有会话 */
  getAllSessions(): Promise<Session[]> | Session[];

  /** 获取会话详情 */
  getSessionDetail(sessionId: string): Promise<SessionDetail | null> | SessionDetail | null;

  /** 获取统计信息 */
  getStats(): Promise<SessionStats> | SessionStats;

  /** 检查服务是否可用 */
  isAvailable(): boolean;
}

/**
 * Session 服务注册表
 */
class SessionServiceRegistry {
  private services = new Map<AppType, SessionService>();

  /**
   * 注册服务
   */
  register(service: SessionService): void {
    this.services.set(service.appType, service);
  }

  /**
   * 获取指定类型的服务
   */
  get(appType: AppType): SessionService | undefined {
    return this.services.get(appType);
  }

  /**
   * 获取所有支持的应用类型
   */
  getSupportedAppTypes(): AppType[] {
    return Array.from(this.services.keys());
  }
}

// 导出单例
export const sessionServiceRegistry = new SessionServiceRegistry();
