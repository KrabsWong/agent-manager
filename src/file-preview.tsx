/**
 * File Preview Window Entry Point
 *
 * Standalone entry for the file preview window
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  Folder,
  GitBranch,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { cn } from './lib/utils';
import { treeApi, gitApi, type TreeNode } from './lib/api';
import { FilePreview } from './components/sessions/FilePreview';
import { GitDiffView } from './components/sessions/GitDiffView';
import { GitDiffPreview } from './components/sessions/GitDiffPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './index.css';
import './lib/i18n';

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
          isActive && 'bg-primary/10 hover:bg-primary/20'
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
  const [sessionDirectory, setSessionDirectory] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [hasGitChanges, setHasGitChanges] = useState(false);

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
    if (dir) {
      setSessionDirectory(dir);
    }
    if (session) {
      setSessionTitle(decodeURIComponent(session));
    }
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
      const totalChanges =
        status.staged.length + status.unstaged.length + status.untracked.length;
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
      document.title = sessionDirectory.split('/').pop() || 'File Preview';
    }
  }, [sessionDirectory, loadTree, checkGitStatus]);

  const handleFileClick = useCallback(async (path: string, name: string) => {
    try {
      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
      const isImage = imageExts.some((ext) => name.toLowerCase().endsWith(ext));

      let content: string;
      if (isImage) {
        content = (await window.electronAPI.invoke('file:readImage', path)) as string;
      } else {
        content = (await window.electronAPI.invoke('file:read', path)) as string;
      }

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
        <p className="text-muted-foreground">No directory specified</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-card">
      <div
        className="px-4 py-2 border-b bg-muted/30 shrink-0 pl-20"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {sessionTitle && (
          <p className="text-sm font-bold truncate">
            {sessionTitle}
          </p>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground truncate">
            {sessionDirectory.split('/').pop() || 'Workspace'}
          </span>
          <span className="text-[10px] text-muted-foreground/60 truncate">
            {sessionDirectory}
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r bg-card/50 flex flex-col shrink-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col h-full"
          >
            <div className="px-3 py-2 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="files" className="flex-1 text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  Files
                </TabsTrigger>
                {hasGitChanges && (
                  <TabsTrigger value="git" className="flex-1 text-xs">
                    <GitBranch className="h-3 w-3 mr-1" />
                    Git
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="files" className="flex-1 overflow-auto m-0 p-0">
              {loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Loading...
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
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FilePreviewApp />
  </React.StrictMode>
);
