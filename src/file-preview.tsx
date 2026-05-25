/**
 * File Preview Window Entry Point
 *
 * Standalone entry for the file preview window
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, GitBranch, ChevronRight, ChevronDown, FolderOpen, FileText } from 'lucide-react';
import { cn } from './lib/utils';
import { fileApi, treeApi } from './lib/api/files';
import { gitApi } from './lib/api/git';
import { ThemeProvider } from './components/ThemeProvider';
import { FilePreview } from './components/sessions/FilePreview';
import { GitDiffView } from './components/sessions/GitDiffView';
import { GitDiffPreview } from './components/sessions/GitDiffPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { applyAccentColor, type AccentColor } from './lib/theme/colors';
import type { TreeNode } from './types';
import './index.css';
import './lib/i18n';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

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
        data-testid={isDirectory ? 'file-tree-directory' : 'file-tree-file'}
        data-file-path={node.path}
        className={cn(
          'w-full flex items-center gap-1.5 py-1 hover:bg-primary-muted transition-colors text-left group whitespace-nowrap',
          isActive && 'bg-primary-light hover:bg-primary-light'
        )}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        title={node.path}
      >
        <span className="w-3 flex-shrink-0 inline-flex justify-center">
          {isDirectory &&
            hasChildren &&
            (isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ))}
        </span>
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span
          className={cn(
            'text-xs truncate',
            isActive ? 'text-primary font-medium' : 'text-foreground'
          )}
          title={node.name}
        >
          {node.name}
        </span>
      </button>
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

function FilePreviewApp() {
  const { t } = useTranslation();
  const [sessionDirectory, setSessionDirectory] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [hasGitChanges, setHasGitChanges] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [accentColor, setAccentColor] = useState<AccentColor>('default');

  const [previewFile, setPreviewFile] = useState<{
    path: string;
    name: string;
    content: string;
  } | null>(null);

  const [diffPreview, setDiffPreview] = useState<{
    path: string;
    name: string;
    original: string;
    modified: string;
  } | null>(null);

  const [sessionTitle, setSessionTitle] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dir = params.get('dir');
    const session = params.get('session');
    const themeParam = params.get('theme') as Theme | null;
    const accentParam = params.get('accentColor') as AccentColor | null;
    if (dir) {
      setSessionDirectory(dir);
    }
    if (session) {
      setSessionTitle(decodeURIComponent(session));
    }
    if (themeParam) {
      setTheme(themeParam);
    }
    if (accentParam) {
      setAccentColor(accentParam);
    }
  }, []);

  const applyTheme = useCallback((currentTheme: Theme, currentAccent: AccentColor) => {
    let resolved: ResolvedTheme;
    if (currentTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = currentTheme;
    }

    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    applyAccentColor(currentAccent, resolved === 'dark');
  }, []);

  useEffect(() => {
    applyTheme(theme, accentColor);
  }, [theme, accentColor, applyTheme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(theme, accentColor);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, accentColor, applyTheme]);

  useEffect(() => {
    const handleThemeChanged = (...args: unknown[]) => {
      const [_theme, _accentColor] = args as [Theme, AccentColor];
      setTheme(_theme);
      setAccentColor(_accentColor);
    };

    window.electronAPI.on('theme:changed', handleThemeChanged);
    return () => {
      window.electronAPI.removeAllListeners('theme:changed');
    };
  }, []);

  const loadTree = useCallback(async () => {
    if (!sessionDirectory) return;
    setLoading(true);
    try {
      const nodes = await treeApi.getDirectoryTree(sessionDirectory);
      setTree(nodes);
    } catch (err) {
      console.error('Failed to load directory tree:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionDirectory]);

  const checkGitStatus = useCallback(async () => {
    if (!sessionDirectory) {
      setHasGitChanges(false);
      return;
    }
    try {
      const status = await gitApi.getStatus(sessionDirectory);
      const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;
      setHasGitChanges(status.isGitRepo && totalChanges > 0);
    } catch (err) {
      console.error('Failed to check git status:', err);
      setHasGitChanges(false);
    }
  }, [sessionDirectory]);

  useEffect(() => {
    if (sessionDirectory) {
      loadTree();
      checkGitStatus();
      document.title = sessionDirectory.split('/').pop() || t('preview.title');
    }
  }, [sessionDirectory, loadTree, checkGitStatus, t]);

  const handleFileClick = useCallback(async (path: string, name: string) => {
    try {
      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
      const isImage = imageExts.some((ext) => name.toLowerCase().endsWith(ext));

      const content = isImage ? await fileApi.readImage(path) : await fileApi.read(path);

      setPreviewFile({ path, name, content });
      setDiffPreview(null);
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }, []);

  const handleGitFileSelect = useCallback(
    async (path: string, name: string) => {
      if (!sessionDirectory) return;
      try {
        const diff = await gitApi.getFileDiff(sessionDirectory, path);
        setDiffPreview({
          path,
          name,
          original: diff.original,
          modified: diff.modified,
        });
        setPreviewFile(null);
      } catch (err) {
        console.error('Failed to get file diff:', err);
      }
    },
    [sessionDirectory]
  );

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const handleCloseDiffPreview = useCallback(() => {
    setDiffPreview(null);
  }, []);

  if (!sessionDirectory) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('preview.noDirectory')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-card" data-testid="file-preview-window">
      <div
        className="px-4 py-2 border-b border-primary-border bg-primary-muted shrink-0 pl-20"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {sessionTitle && <p className="text-sm font-bold truncate text-primary">{sessionTitle}</p>}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-primary/70 truncate">
            {sessionDirectory.split('/').pop() || t('preview.workspace')}
          </span>
          <span className="text-[10px] text-primary/50 truncate">{sessionDirectory}</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r border-primary-border bg-card/50 flex flex-col shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-3 py-2 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="files" className="flex-1 text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  {t('preview.files')}
                </TabsTrigger>
                {hasGitChanges && (
                  <TabsTrigger value="git" className="flex-1 text-xs" data-testid="git-tab">
                    <GitBranch className="h-3 w-3 mr-1" />
                    Git
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="files" className="flex-1 overflow-auto m-0 p-0">
              {loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {t('preview.loading')}
                </div>
              ) : (
                <div className="py-2">
                  {tree.map((node) => (
                    <TreeItem
                      key={node.path}
                      node={node}
                      defaultExpanded={true}
                      onFileClick={handleFileClick}
                      activeFilePath={previewFile?.path}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {hasGitChanges && (
              <TabsContent value="git" className="flex-1 overflow-hidden m-0 p-0">
                <GitDiffView
                  sessionDirectory={sessionDirectory}
                  onFileSelect={handleGitFileSelect}
                  active={activeTab === 'git'}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="flex-1 min-w-0 bg-background">
          {previewFile ? (
            <FilePreview
              fileName={previewFile.name}
              content={previewFile.content}
              onClose={handleClosePreview}
              className="h-full"
            />
          ) : diffPreview ? (
            <GitDiffPreview
              fileName={diffPreview.name}
              originalContent={diffPreview.original}
              modifiedContent={diffPreview.modified}
              onClose={handleCloseDiffPreview}
              className="h-full"
            />
          ) : (
            <div
              className="h-full flex items-center justify-center text-muted-foreground"
              data-testid="file-preview-empty"
            >
              <p className="text-sm">{t('preview.selectFile')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FilePreviewApp />
    </ThemeProvider>
  </React.StrictMode>
);
