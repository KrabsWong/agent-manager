/**
 * Session Context Panel with File Preview
 *
 * Shows directory tree and CodeMirror-based file preview
 * Features: collapsible sidebar, horizontal scroll, auto-resize
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, treeApi, shellApi, gitApi, type TreeNode } from '@/lib/api';
import { FilePreview } from './FilePreview';
import { GitDiffView } from './GitDiffView';
import { GitDiffPreview } from './GitDiffPreview';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SessionContextPanelProps {
  sessionDirectory?: string;
  className?: string;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
  isVisible?: boolean;
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
  isVisible = true,
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

  // Active tab state
  const [activeTab, setActiveTab] = useState('files');

  // Git status state
  const [hasGitChanges, setHasGitChanges] = useState(false);

  // Git diff preview state
  const [diffPreview, setDiffPreview] = useState<{
    path: string;
    name: string;
    original: string;
    modified: string;
  } | null>(null);

  // External open confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingOpenFile, setPendingOpenFile] = useState<{ path: string; name: string } | null>(
    null
  );

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

  // Check git status to determine if we should show the git diff tab
  useEffect(() => {
    const checkGitStatus = async () => {
      if (!sessionDirectory) {
        setHasGitChanges(false);
        return;
      }

      try {
        const status = await gitApi.getStatus(sessionDirectory);
        const totalChanges =
          status.staged.length + status.unstaged.length + status.untracked.length;
        const hasChanges = status.isGitRepo && totalChanges > 0;
        setHasGitChanges(hasChanges);

        // If currently on git tab but no changes anymore, switch back to files
        if (!hasChanges && activeTab === 'git') {
          setActiveTab('files');
        }
      } catch {
        // Not a git repo or error checking
        setHasGitChanges(false);
        if (activeTab === 'git') {
          setActiveTab('files');
        }
      }
    };

    checkGitStatus();
  }, [sessionDirectory, activeTab]);

  // Handle git file selection for diff preview
  const handleGitFileSelect = useCallback(
    async (filePath: string, fileName: string) => {
      if (!sessionDirectory) return;

      // Close file preview when opening diff preview
      if (previewFile) {
        setPreviewFile(null);
      }

      try {
        const result = await gitApi.getFileDiff(sessionDirectory, filePath);
        setDiffPreview({
          path: filePath,
          name: fileName,
          original: result.original,
          modified: result.modified,
        });
        onPreviewStart?.();
      } catch (err) {
        console.error('Failed to load file diff:', err);
      }
    },
    [sessionDirectory, previewFile, onPreviewStart]
  );

  // Handle close diff preview
  const handleCloseDiffPreview = useCallback(() => {
    setDiffPreview(null);
    onPreviewEnd?.();
  }, [onPreviewEnd]);

  // Check if file is an image
  const isImageFile = useCallback((fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const imageExts = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'svg',
      'bmp',
      'ico',
      'icns',
      'tiff',
      'tif',
      'avif',
      'heic',
      'heif',
    ];
    return imageExts.includes(ext);
  }, []);

  // Check if file needs confirmation before opening externally
  const needsConfirmation = useCallback((fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    // Binary files that should not be opened directly in preview
    const binaryExts = [
      // Archives
      'zip',
      'rar',
      '7z',
      'tar',
      'gz',
      'bz2',
      'xz',
      'lz4',
      'zst',
      // Executables
      'exe',
      'msi',
      'dmg',
      'pkg',
      'deb',
      'rpm',
      'appimage',
      // macOS bundles
      'app',
      'framework',
      'bundle',
      // Documents that need specific apps
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      // Binary assets
      'icns',
      'ico',
      'cur',
      // Databases
      'db',
      'sqlite',
      'sqlite3',
      // Certificates
      'cer',
      'cert',
      'crt',
      'pem',
      'p12',
      'pfx',
      // Fonts
      'ttf',
      'otf',
      'woff',
      'woff2',
      'eot',
      // Compiled files
      'wasm',
      'so',
      'dll',
      'dylib',
    ];
    return binaryExts.includes(ext);
  }, []);

  // Handle file click - load content and show preview
  const handleFileClick = useCallback(
    async (filePath: string, fileName: string) => {
      if (previewFile?.path === filePath) return;

      // Close diff preview when opening file preview
      if (diffPreview) {
        setDiffPreview(null);
      }

      // Check if file needs confirmation before opening
      if (needsConfirmation(fileName)) {
        setPendingOpenFile({ path: filePath, name: fileName });
        setConfirmOpen(true);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const content = isImageFile(fileName)
          ? await api.file.readImage(filePath)
          : await api.file.read(filePath);

        setPreviewFile({ path: filePath, name: fileName, content });
        onPreviewStart?.();
      } catch (err) {
        console.error('Failed to read file:', err);
        // Show error toast or notification before opening externally
        const errorMsg = err instanceof Error ? err.message : 'Failed to read file';
        if (errorMsg.includes('too large')) {
          // For large files, just open externally without showing error
          shellApi.openPath(filePath);
        } else {
          shellApi.openPath(filePath);
        }
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [previewFile, diffPreview, onPreviewStart, isImageFile, needsConfirmation]
  );

  // Handle confirmed external open
  const handleConfirmOpen = useCallback(async () => {
    if (pendingOpenFile) {
      await shellApi.openPath(pendingOpenFile.path);
      setPendingOpenFile(null);
    }
    setConfirmOpen(false);
  }, [pendingOpenFile]);

  // Handle cancel external open
  const handleCancelOpen = useCallback(() => {
    setConfirmOpen(false);
    setPendingOpenFile(null);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
    onPreviewEnd?.();
  }, [onPreviewEnd]);

  // Hide panel completely when not visible
  useEffect(() => {
    if (!isVisible) {
      // Close any open previews when hiding
      if (previewFile) {
        handleClosePreview();
      }
      if (diffPreview) {
        setDiffPreview(null);
        onPreviewEnd?.();
      }
    }
  }, [isVisible, previewFile, diffPreview, handleClosePreview, onPreviewEnd]);

  // Store refs for cleanup
  const previewFileRef = useRef(previewFile);
  const diffPreviewRef = useRef(diffPreview);
  const onPreviewEndRef = useRef(onPreviewEnd);

  useEffect(() => {
    previewFileRef.current = previewFile;
    diffPreviewRef.current = diffPreview;
    onPreviewEndRef.current = onPreviewEnd;
  });

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Ensure preview state is reset when component unmounts
      if (previewFileRef.current || diffPreviewRef.current) {
        onPreviewEndRef.current?.();
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  // Handle no session directory - still show collapsible panel
  const hasAnyPreview = previewFile || diffPreview;
  const showCollapsed = isCollapsed && !hasAnyPreview;
  // File tree width: narrower when previewing to give more space to preview panel
  const workDirWidth = hasAnyPreview ? 'w-48' : showCollapsed ? 'w-10' : 'w-72';

  if (!sessionDirectory) {
    return (
      <div className={cn('h-full flex w-72', className)}>
        <div
          className={cn(
            'h-full bg-card/30 flex flex-col min-h-0 transition-all duration-200 shrink-0',
            workDirWidth
          )}
        >
          {showCollapsed ? (
            <div className="flex flex-col items-center py-2">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 hover:bg-primary-muted rounded-md transition-colors"
                title={t('contextPanel.expand', 'Expand')}
              >
                <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b bg-primary-muted shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-primary uppercase tracking-wider">
                      {t('contextPanel.workDir', 'Work')}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 hover:bg-primary-light rounded transition-colors"
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
    <div className={cn('h-full flex', hasAnyPreview ? 'w-[1250px]' : 'w-72', className)}>
      {/* Directory Tree Panel */}
      <div
        className={cn(
          'h-full bg-card/30 flex flex-col min-h-0 transition-all duration-200 shrink-0',
          workDirWidth
        )}
      >
        {showCollapsed ? (
          // Collapsed state - only when not previewing
          <div className="flex flex-col items-center py-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 hover:bg-primary-muted rounded-md transition-colors"
              title={t('contextPanel.expand', 'Expand')}
            >
              <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          // Expanded state with Tabs
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              // Close preview when switching away from its tab
              if (value === 'files' && diffPreview) {
                setDiffPreview(null);
                onPreviewEnd?.();
              } else if (value === 'git' && previewFile) {
                setPreviewFile(null);
                onPreviewEnd?.();
              }
            }}
            className="flex flex-col h-full"
          >
            {/* Header with tabs and collapse button */}
            <div className="border-b bg-primary-muted shrink-0">
              <div className="px-2 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <TabsList
                    className={cn(
                      'h-7 justify-start bg-transparent p-0 gap-1',
                      hasGitChanges ? 'w-full' : 'w-auto'
                    )}
                  >
                    <TabsTrigger
                      value="files"
                      className="h-6 px-2 text-[10px] data-[state=active]:bg-muted"
                    >
                      <Folder className="h-3 w-3 mr-1" />
                      {t('contextPanel.filesTab', 'Files')}
                    </TabsTrigger>
                    {hasGitChanges && (
                      <TabsTrigger
                        value="git"
                        className="h-6 px-2 text-[10px] data-[state=active]:bg-muted"
                      >
                        <GitBranch className="h-3 w-3 mr-1" />
                        {t('contextPanel.gitDiffTab', 'Git Diff')}
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>
              </div>
              <div className="px-3 pb-2">
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
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <TabsContent value="files" className="h-full m-0 mt-0">
                {/* Tree content - with horizontal scroll */}
                <div className="h-full overflow-auto py-2">
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
              </TabsContent>

              {hasGitChanges && (
                <TabsContent value="git" className="h-full m-0 mt-0">
                  <GitDiffView
                    sessionDirectory={sessionDirectory}
                    className="h-full"
                    onFileSelect={handleGitFileSelect}
                    active={activeTab === 'git'}
                  />
                </TabsContent>
              )}
            </div>

            {/* Loading indicator for preview */}
            {isLoadingPreview && activeTab === 'files' && (
              <div className="px-3 py-2 border-t bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
                  <span className="text-[10px] text-muted-foreground">Loading...</span>
                </div>
              </div>
            )}
          </Tabs>
        )}
      </div>

      {/* File Preview Panel */}
      {previewFile && (
        <FilePreview
          fileName={previewFile.name}
          content={previewFile.content}
          onClose={handleClosePreview}
          className="flex-1 min-w-0 overflow-hidden"
        />
      )}

      {/* Git Diff Preview Panel */}
      {diffPreview && (
        <GitDiffPreview
          fileName={diffPreview.name}
          originalContent={diffPreview.original}
          modifiedContent={diffPreview.modified}
          onClose={handleCloseDiffPreview}
          className="flex-1 min-w-0 overflow-hidden"
        />
      )}

      {/* External Open Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('contextPanel.confirmOpenTitle')}</DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="contextPanel.confirmOpenDescription"
                values={{ fileName: pendingOpenFile?.name || '' }}
                components={[<span key="0" className="font-medium text-foreground" />]}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={handleCancelOpen}>
              {t('contextPanel.confirmOpenCancel')}
            </Button>
            <Button onClick={handleConfirmOpen}>{t('contextPanel.confirmOpenButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
