/**
 * Session Context Panel with File Preview
 *
 * Shows directory tree and Monaco-based file preview
 * Features: collapsible sidebar, horizontal scroll, auto-resize
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { treeApi, shellApi, type TreeNode } from '@/lib/api';
import { FilePreview } from './FilePreview';

interface SessionContextPanelProps {
  sessionDirectory?: string;
  className?: string;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
  isPreviewingFile?: boolean;
}

interface TreeItemProps {
  node: TreeNode;
  depth?: number;
  defaultExpanded?: boolean;
  onFileClick: (path: string, name: string) => void;
  activeFilePath?: string;
}

function TreeItem({
  node,
  depth = 0,
  defaultExpanded = false,
  onFileClick,
  activeFilePath,
}: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && node.children && node.children.length > 0;
  const isActive = node.path === activeFilePath;

  const handleClick = async () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(node.path, node.name);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-1.5 py-1 hover:bg-muted/50 transition-colors text-left group whitespace-nowrap',
          isActive && 'bg-muted/70 hover:bg-muted/70'
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        title={node.path}
      >
        {/* Expand/collapse icon */}
        <span className="w-3 flex-shrink-0 inline-flex justify-center">
          {isDirectory &&
            hasChildren &&
            (isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ))}
        </span>

        {/* File/Folder icon */}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <FileText
            className={cn(
              'h-3.5 w-3.5 flex-shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground/70'
            )}
          />
        )}

        {/* Name - no truncate to allow horizontal scroll */}
        <span
          className={cn(
            'text-xs flex-1',
            isActive
              ? 'text-primary font-medium'
              : isDirectory
                ? 'text-muted-foreground font-medium'
                : 'text-muted-foreground/80'
          )}
        >
          {node.name}
        </span>
      </button>

      {/* Children */}
      {isDirectory && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              defaultExpanded={false}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionContextPanel({
  sessionDirectory,
  className,
  onPreviewStart,
  onPreviewEnd,
  isPreviewingFile: externalIsPreviewingFile,
}: SessionContextPanelProps) {
  const { t } = useTranslation();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    name: string;
    content: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const loadTree = useCallback(async () => {
    if (!sessionDirectory) return;

    setLoading(true);
    setError(null);

    try {
      const nodes = await treeApi.getDirectoryTree(sessionDirectory);
      setTree(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, [sessionDirectory]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Handle file click - load content and show preview
  const handleFileClick = useCallback(
    async (filePath: string, fileName: string) => {
      if (previewFile?.path === filePath) return;

      setIsLoadingPreview(true);
      try {
        const content = (await window.electronAPI.invoke('file:read', filePath)) as string;
        setPreviewFile({ path: filePath, name: fileName, content });
        onPreviewStart?.();
      } catch (err) {
        console.error('Failed to read file:', err);
        shellApi.openPath(filePath);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [previewFile, onPreviewStart]
  );

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
    onPreviewEnd?.();
  }, [onPreviewEnd]);

  // Handle no session directory - still show collapsible panel
  const showCollapsed = isCollapsed && !previewFile;
  const workDirWidth = previewFile ? 'w-[200px]' : showCollapsed ? 'w-10' : 'w-72';

  if (!sessionDirectory) {
    return (
      <div className={cn('h-full flex', className)}>
        <div
          className={cn(
            'h-full border-l bg-card/30 flex flex-col min-h-0 transition-all duration-200 shrink-0',
            workDirWidth
          )}
        >
          {showCollapsed ? (
            <div className="flex flex-col items-center py-2">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title={t('contextPanel.expand', 'Expand')}
              >
                <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b bg-muted/20 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {t('contextPanel.workDir', 'Work')}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={t('contextPanel.collapse', 'Collapse')}
                  >
                    <PanelRightClose className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground text-center">
                  {t('contextPanel.noWorkDir', 'No working directory')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex', className)}>
      {/* Directory Tree Panel */}
      <div
        className={cn(
          'h-full border-l bg-card/30 flex flex-col min-h-0 transition-all duration-200 shrink-0',
          workDirWidth
        )}
      >
        {showCollapsed ? (
          // Collapsed state - only when not previewing
          <div className="flex flex-col items-center py-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title={t('contextPanel.expand', 'Expand')}
            >
              <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          // Expanded state
          <>
            {/* Header with collapse button (hidden when previewing) */}
            <div className="px-3 py-2 border-b bg-muted/20 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Folder className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {t('contextPanel.workDir', 'Work')}
                  </span>
                </div>
                {!previewFile && (
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={t('contextPanel.collapse', 'Collapse')}
                  >
                    <PanelRightClose className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 group">
                <span
                  className="text-xs font-mono text-muted-foreground truncate flex-1"
                  title={sessionDirectory}
                >
                  {previewFile
                    ? sessionDirectory.split('/').pop()
                    : sessionDirectory.split('/').slice(-2).join('/')}
                </span>
                <button
                  onClick={() => shellApi.openPath(sessionDirectory)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                  title={t('contextPanel.openInFinder', 'Open in Finder')}
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Tree content - with horizontal scroll */}
            <div className="flex-1 overflow-auto py-2 min-h-0">
              {loading && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
                </div>
              )}

              {error && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}

              {!loading && !error && tree.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('contextPanel.emptyDir', 'Empty directory')}
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                tree.map((node) => (
                  <TreeItem
                    key={node.path}
                    node={node}
                    defaultExpanded={true}
                    onFileClick={handleFileClick}
                    activeFilePath={previewFile?.path}
                  />
                ))}
            </div>

            {/* Loading indicator for preview */}
            {isLoadingPreview && (
              <div className="px-3 py-2 border-t bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
                  <span className="text-[10px] text-muted-foreground">Loading...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* File Preview Panel */}
      {previewFile && (
        <FilePreview
          filePath={previewFile.path}
          fileName={previewFile.name}
          content={previewFile.content}
          onClose={handleClosePreview}
          className="flex-1 min-w-0 overflow-hidden"
        />
      )}
    </div>
  );
}
