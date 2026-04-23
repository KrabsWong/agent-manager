/**
 * Git Diff Preview Component
 *
 * Uses react-diff-viewer-continued for lightweight diff display
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, GitCompare, LayoutGrid, Rows3, FileCode } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { cn } from '@/lib/utils';

interface GitDiffPreviewProps {
  fileName: string;
  originalContent: string;
  modifiedContent: string;
  onClose: () => void;
  className?: string;
}

// Check if file is an image
function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return imageExtensions.includes(ext);
}

// Check if file is binary (not suitable for text diff)
function isBinaryFile(fileName: string): boolean {
  const binaryExtensions = [
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico', '.tif', '.tiff',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    // Executables
    '.exe', '.dll', '.so', '.dylib', '.bin',
    // Audio/Video
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
    // Fonts
    '.ttf', '.otf', '.woff', '.woff2',
  ];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return binaryExtensions.includes(ext);
}

export function GitDiffPreview({
  fileName,
  originalContent,
  modifiedContent,
  onClose,
  className,
}: GitDiffPreviewProps) {
  const { t } = useTranslation();
  const [splitView, setSplitView] = useState(true);
  
  // Track theme changes
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    };
    
    // Initial check
    updateTheme();
    
    // Listen for class changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  // Check file type
  const fileType = useMemo(() => {
    if (isImageFile(fileName)) return 'image';
    if (isBinaryFile(fileName)) return 'binary';
    return 'text';
  }, [fileName]);

  // Calculate diff stats (only for text files)
  const diffStats = useMemo(() => {
    if (fileType !== 'text') return null;
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    
    return {
      originalLines: originalLines.length,
      modifiedLines: modifiedLines.length,
      diff: modifiedLines.length - originalLines.length,
    };
  }, [originalContent, modifiedContent, fileType]);

  // Render content based on file type
  const renderContent = () => {
    if (fileType === 'image') {
      // Backend returns base64 for diff, check if it needs data URL wrapper
      const getImageSrc = (content: string) => {
        if (!content || content.length === 0) return '';
        return content.startsWith('data:') ? content : `data:image/${fileName.split('.').pop() || 'png'};base64,${content}`;
      };
      
      const originalSrc = getImageSrc(originalContent);
      const modifiedSrc = getImageSrc(modifiedContent);
      const hasOriginal = originalSrc.length > 0;
      const hasModified = modifiedSrc.length > 0;
      
      return (
        <div className="flex-1 overflow-auto p-4">
          <div className="flex gap-4 h-full">
            {/* Original Image - red background for deleted, empty placeholder if new file */}
            <div className={`flex-1 flex items-center justify-center rounded-lg p-4 overflow-auto ${hasOriginal ? 'bg-red-50 dark:bg-red-500/10' : 'bg-muted/30 border-2 border-dashed border-muted'}`}>
              {hasOriginal ? (
                <img 
                  src={originalSrc}
                  alt="Original" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-sm">{t('diff.noOriginal', 'New file')}</span>
              )}
            </div>
            
            {/* Modified Image - green background for added, empty placeholder if deleted */}
            <div className={`flex-1 flex items-center justify-center rounded-lg p-4 overflow-auto ${hasModified ? 'bg-green-50 dark:bg-green-500/10' : 'bg-muted/30 border-2 border-dashed border-muted'}`}>
              {hasModified ? (
                <img 
                  src={modifiedSrc}
                  alt="Modified" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-sm">{t('diff.noModified', 'Deleted')}</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (fileType === 'binary') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <FileCode className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            {t('diff.binaryFile', 'Binary File')}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('diff.binaryDiffNotSupported', 'Binary file diff is not supported. The file has been modified.')}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{t('diff.originalSize', 'Original')}: {originalContent.length} bytes</span>
            <span>→</span>
            <span>{t('diff.modifiedSize', 'Modified')}: {modifiedContent.length} bytes</span>
          </div>
        </div>
      );
    }

    // Text file - show diff viewer with dynamic styles based on theme
    const lightStyles = {
      diffViewerBackground: 'transparent',
      addedBackground: 'rgba(34, 197, 94, 0.1)',
      addedGutterBackground: 'rgba(34, 197, 94, 0.15)',
      removedBackground: 'rgba(239, 68, 68, 0.1)',
      removedGutterBackground: 'rgba(239, 68, 68, 0.15)',
      wordAddedBackground: 'rgba(34, 197, 94, 0.3)',
      wordRemovedBackground: 'rgba(239, 68, 68, 0.3)',
      gutterBackground: 'hsl(var(--muted))',
      gutterBackgroundDark: 'hsl(var(--muted))',
      diffViewerColor: 'hsl(var(--foreground))',
      addedColor: 'hsl(var(--foreground))',
      removedColor: 'hsl(var(--foreground))',
      gutterColor: 'hsl(var(--muted-foreground))',
      codeFoldBackground: 'hsl(var(--muted))',
      codeFoldGutterBackground: 'hsl(var(--muted))',
      emptyLineBackground: 'transparent',
    };
    
    const darkStyles = {
      diffViewerBackground: 'transparent',
      addedBackground: 'rgba(34, 197, 94, 0.15)',
      addedGutterBackground: 'rgba(34, 197, 94, 0.2)',
      removedBackground: 'rgba(239, 68, 68, 0.15)',
      removedGutterBackground: 'rgba(239, 68, 68, 0.2)',
      wordAddedBackground: 'rgba(34, 197, 94, 0.35)',
      wordRemovedBackground: 'rgba(239, 68, 68, 0.35)',
      gutterBackground: 'hsl(var(--muted))',
      gutterBackgroundDark: 'hsl(var(--muted))',
      diffViewerColor: 'hsl(var(--foreground))',
      addedColor: 'hsl(var(--foreground))',
      removedColor: 'hsl(var(--foreground))',
      gutterColor: 'hsl(var(--muted-foreground))',
      codeFoldBackground: 'hsl(var(--muted))',
      codeFoldGutterBackground: 'hsl(var(--muted))',
      emptyLineBackground: 'transparent',
    };

    return (
      <div className="flex-1 relative min-h-0 min-w-0 w-full overflow-auto [&_.diff-container]:!min-w-0">
        <ReactDiffViewer
          key={isDark ? 'dark' : 'light'} // Force re-render on theme change
          oldValue={originalContent}
          newValue={modifiedContent}
          splitView={splitView}
          hideLineNumbers={false}
          showDiffOnly={true}
          extraLinesSurroundingDiff={3}
          useDarkTheme={isDark}
          hideSummary={true}
          styles={{
            variables: {
              light: lightStyles,
              dark: darkStyles,
            },
          }}
        />
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full w-full min-w-0 bg-card border-l border-primary-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-muted shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GitCompare className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate text-primary" title={fileName}>
              {fileName}
            </p>
            <p className="text-[10px] text-primary/70 truncate">
              {fileType === 'text' && diffStats ? (
                <>{diffStats.originalLines} → {diffStats.modifiedLines} lines</>
              ) : fileType === 'image' ? (
                <>{t('diff.imageFile', 'Image File')}</>
              ) : (
                <>{t('diff.binaryFile', 'Binary File')}</>
              )}
            </p>
          </div>
        </div>

        {/* View mode toggle - only for text files */}
        {fileType === 'text' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-background/50 rounded-md p-0.5 border border-primary-border">
              <button
                onClick={() => setSplitView(true)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-all',
                  splitView
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-primary/60 hover:text-primary'
                )}
                title={t('diff.splitView', 'Split View')}
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">{t('diff.split', 'Split')}</span>
              </button>
              <button
                onClick={() => setSplitView(false)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-all',
                  !splitView
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-primary/60 hover:text-primary'
                )}
                title={t('diff.unifiedView', 'Unified View')}
              >
                <Rows3 className="h-3 w-3" />
                <span className="hidden sm:inline">{t('diff.unified', 'Unified')}</span>
              </button>
            </div>

            <div className="w-px h-4 bg-primary-border mx-1" />

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-primary-light rounded-md transition-colors"
              title="Close diff"
            >
              <X className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        )}

        {/* Just close button for non-text files */}
        {fileType !== 'text' && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary-light rounded-md transition-colors"
            title="Close diff"
          >
            <X className="h-3.5 w-3.5 text-primary" />
          </button>
        )}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
