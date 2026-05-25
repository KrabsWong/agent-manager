import type { AppSupportStatus, SessionStats } from './session';

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

export type SessionStatsSummary = SessionStats;

export interface AppSupportSummary {
  supported: boolean;
  status: AppSupportStatus;
  isAvailable: boolean;
  notAvailableReason?: string;
}

export interface TerminalInfo {
  preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal';
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}
