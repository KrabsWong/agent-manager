/**
 * File Preview Modal Component
 *
 * Full-screen overlay modal with file browser on left and preview on right
 */

import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Folder,
  GitBranch,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, treeApi, gitApi, type TreeNode } from '@/lib/api';
import { FilePreview } from './FilePreview';
import { GitDiffView } from './GitDiffView';
import { GitDiffPreview } from './GitDiffPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDirectory?: string;
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

export function FilePreviewModal({
  isOpen,
  onClose,
  sessionDirectory,
}: FilePreviewModalProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [hasGitChanges, setHasGitChanges] = useState(false);

  // Preview states
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
      console.log('[FilePreviewModal] Git status:', { isGitRepo: status.isGitRepo, totalChanges });
      setHasGitChanges(status.isGitRepo && totalChanges > 0);
    } catch (err) {
      console.error('[FilePreviewModal] Failed to check git status:', err);
      setHasGitChanges(false);
    }
  }, [sessionDirectory]);

  useEffect(() => {
    if (isOpen && sessionDirectory) {
      loadTree();
      checkGitStatus();
    }
  }, [isOpen, sessionDirectory, loadTree, checkGitStatus]);

  const handleFileClick = useCallback(async (path: string, name: string) => {
    try {
      // Check if image file
      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
      const isImage = imageExts.some((ext) => name.toLowerCase().endsWith(ext));

      const content = isImage
        ? await api.file.readImage(path)
        : await api.file.read(path);

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
          modified: diff.modified 
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

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full h-full max-w-[1400px] bg-card rounded-xl shadow-2xl border border-primary-border overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary-border bg-primary-muted shrink-0">
          <h2 className="text-sm font-semibold text-primary">
            {sessionDirectory?.split('/').pop() || 'Workspace'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex min-h-0">
          {/* Left sidebar - File Tree */}
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

          {/* Right content area */}
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
    </div>
  );
}
