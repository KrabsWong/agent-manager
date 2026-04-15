/**
 * Git Diff View Component
 *
 * Shows git repository status with changed files and line statistics
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, FileText, Plus, Minus, Circle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gitApi, type GitStatusResult, type GitFileChange } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useGitWatch } from '@/hooks/useGitWatch';

interface GitDiffViewProps {
  sessionDirectory?: string;
  className?: string;
  onFileSelect?: (filePath: string, fileName: string) => void;
  active?: boolean;
}

// File change status indicator
function FileStatusIcon({ status }: { status: GitFileChange['status'] }) {
  switch (status) {
    case 'added':
      return <Plus className="h-3 w-3 text-green-500" />;
    case 'modified':
      return <Circle className="h-3 w-3 text-yellow-500 fill-yellow-500" />;
    case 'deleted':
      return <Minus className="h-3 w-3 text-red-500" />;
    case 'renamed':
      return <GitBranch className="h-3 w-3 text-blue-500" />;
    case 'untracked':
      return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    default:
      return <FileText className="h-3 w-3 text-muted-foreground" />;
  }
}

// File change row component
function FileChangeRow({
  file,
  onClick,
  isSelected,
}: {
  file: GitFileChange;
  onClick: () => void;
  isSelected: boolean;
}) {
  const displayPath = file.path.split('/').slice(-2).join('/');

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 transition-colors text-left group',
        isSelected && 'bg-muted/70 hover:bg-muted/70'
      )}
    >
      <FileStatusIcon status={file.status} />

      <span className="text-xs text-muted-foreground truncate flex-1" title={file.path}>
        {displayPath}
      </span>

      {(file.additions > 0 || file.deletions > 0) && (
        <div className="flex items-center gap-1.5 text-[10px] tabular-nums">
          {file.additions > 0 && <span className="text-green-500">+{file.additions}</span>}
          {file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
        </div>
      )}
    </button>
  );
}

// Section header component
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 border-y">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

export function GitDiffView({
  sessionDirectory,
  className,
  onFileSelect,
  active = true,
}: GitDiffViewProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const loadGitStatus = useCallback(async () => {
    if (!sessionDirectory) return;

    setLoading(true);
    setError(null);

    try {
      const result = await gitApi.getStatus(sessionDirectory);
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load git status');
    } finally {
      setLoading(false);
    }
  }, [sessionDirectory]);

  // Handle file click
  const handleFileClick = useCallback(
    (file: GitFileChange) => {
      setSelectedFile(file.path);
      onFileSelect?.(file.path, file.path.split('/').pop() || file.path);
    },
    [onFileSelect]
  );

  // Handle git changes - reload status and refresh selected file diff
  const handleGitChange = useCallback(() => {
    console.log('[GitDiffView] Git changes detected, reloading...');
    loadGitStatus();
    // If a file is selected, notify parent to refresh the diff
    if (selectedFile && onFileSelect) {
      onFileSelect(selectedFile, selectedFile.split('/').pop() || selectedFile);
    }
  }, [loadGitStatus, selectedFile, onFileSelect]);

  // Setup git watching - only when this component/tab is active
  useGitWatch({
    dirPath: sessionDirectory || null,
    enabled: active && !!sessionDirectory,
    onChange: handleGitChange,
  });

  useEffect(() => {
    loadGitStatus();
  }, [loadGitStatus]);

  // Handle refresh
  const handleRefresh = () => {
    loadGitStatus();
  };

  if (!sessionDirectory) {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            {t('contextPanel.noWorkDir', 'No working directory')}
          </p>
        </div>
      </div>
    );
  }

  if (loading && !status) {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-xs text-red-500 text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('common.buttons.retry', 'Retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (!status?.isGitRepo) {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            {t('contextPanel.noGitRepo', 'Not a git repository')}
          </p>
        </div>
      </div>
    );
  }

  const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;

  const totalAdditions =
    status.staged.reduce((sum, f) => sum + f.additions, 0) +
    status.unstaged.reduce((sum, f) => sum + f.additions, 0);

  const totalDeletions =
    status.staged.reduce((sum, f) => sum + f.deletions, 0) +
    status.unstaged.reduce((sum, f) => sum + f.deletions, 0);

  if (totalChanges === 0) {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        {/* Header with branch info */}
        <div className="px-3 py-2 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">{status.branch}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
          <GitBranch className="h-5 w-5 text-green-500" />
          <p className="text-xs text-muted-foreground text-center">
            {t('contextPanel.noChanges', 'No uncommitted changes')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header with branch info and summary */}
      <div className="px-3 py-2 border-b bg-muted/20 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">{status.branch}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3 w-3 text-muted-foreground', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-muted-foreground">
            {totalChanges === 1
              ? t('contextPanel.fileChanged', { count: totalChanges })
              : t('contextPanel.filesChanged', { count: totalChanges })}
          </span>
          {(totalAdditions > 0 || totalDeletions > 0) && (
            <div className="flex items-center gap-2">
              {totalAdditions > 0 && <span className="text-green-500">+{totalAdditions}</span>}
              {totalDeletions > 0 && <span className="text-red-500">-{totalDeletions}</span>}
            </div>
          )}
        </div>
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-auto">
        {/* Staged changes */}
        {status.staged.length > 0 && (
          <>
            <SectionHeader
              title={t('contextPanel.stagedChanges', 'Staged Changes')}
              count={status.staged.length}
            />
            {status.staged.map((file) => (
              <FileChangeRow
                key={file.path}
                file={file}
                onClick={() => handleFileClick(file)}
                isSelected={selectedFile === file.path}
              />
            ))}
          </>
        )}

        {/* Unstaged changes */}
        {status.unstaged.length > 0 && (
          <>
            <SectionHeader
              title={t('contextPanel.unstagedChanges', 'Unstaged Changes')}
              count={status.unstaged.length}
            />
            {status.unstaged.map((file) => (
              <FileChangeRow
                key={file.path}
                file={file}
                onClick={() => handleFileClick(file)}
                isSelected={selectedFile === file.path}
              />
            ))}
          </>
        )}

        {/* Untracked files */}
        {status.untracked.length > 0 && (
          <>
            <SectionHeader
              title={t('contextPanel.untrackedFiles', 'Untracked Files')}
              count={status.untracked.length}
            />
            {status.untracked.map((file) => (
              <FileChangeRow
                key={file.path}
                file={file}
                onClick={() => handleFileClick(file)}
                isSelected={selectedFile === file.path}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
