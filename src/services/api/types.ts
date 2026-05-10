/**
 * API Types - Re-export existing types
 * 
 * This file provides type definitions used by backend adapters.
 * Types are imported from existing type definitions to ensure consistency.
 */

// Re-export all types from existing type definitions
export type {
  Session,
  SessionDetail,
  SessionMessage,
  SessionStats,
  AppSessionSupport,
  AppSupportStatus,
} from '@/types/session';

export type {
  AppSettings,
  AppType,
  AccentColor,
} from '@/types';

// Additional API-specific types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'unknown';
  additions: number;
  deletions: number;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: GitFileChange[];
}

export interface GitFileDiffResult {
  original: string;
  modified: string;
  hasChanges: boolean;
}

export interface TerminalInfo {
  preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal';
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}