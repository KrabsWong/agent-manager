import type {
  ApiResponse,
  AppSupportSummary,
  AppType,
  Session,
  SessionDetail,
  SessionStatsSummary,
  TerminalInfo,
} from '@/types';
import { extractData } from './core';

export const sessionsApi = {
  getAll: async (appType: AppType): Promise<Session[]> => {
    const response = (await window.electronAPI.invoke('sessions:getAll', appType)) as ApiResponse<
      Session[]
    >;
    return extractData(response);
  },

  getDetail: async (sessionId: string, appType: AppType): Promise<SessionDetail | null> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getDetail',
      sessionId,
      appType
    )) as ApiResponse<SessionDetail | null>;
    return extractData(response);
  },

  getStats: async (appType: AppType): Promise<SessionStatsSummary> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getStats',
      appType
    )) as ApiResponse<SessionStatsSummary>;
    return extractData(response);
  },

  getSupportStatus: async (appType: AppType): Promise<AppSupportSummary> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getSupportStatus',
      appType
    )) as ApiResponse<AppSupportSummary>;
    return extractData(response);
  },

  resume: async (sessionId: string, appType: AppType, workingDir?: string): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'sessions:resume',
      sessionId,
      appType,
      workingDir
    )) as ApiResponse<void>;
    return extractData(response);
  },

  getTerminalInfo: async (): Promise<TerminalInfo> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getTerminalInfo'
    )) as ApiResponse<TerminalInfo>;
    return extractData(response);
  },
};
