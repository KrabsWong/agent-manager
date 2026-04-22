/**
 * Git Diff Preview Component
 *
 * Monaco-based diff viewer showing original vs modified file content
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DiffEditor, type Monaco } from '@monaco-editor/react';
import { X, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';

// Get current theme from document
function getCurrentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// Tokyo Night theme colors (dark) - adapted to match app
const tokyoNightTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'a9b1d6', background: '0f172a' },
    { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'bb9af7' },
    { token: 'keyword.control', foreground: 'bb9af7' },
    { token: 'keyword.operator', foreground: '89ddff' },
    { token: 'string', foreground: '9ece6a' },
    { token: 'string.escape', foreground: '89ddff' },
    { token: 'number', foreground: 'ff9e64' },
    { token: 'constant', foreground: 'ff9e64' },
    { token: 'variable', foreground: 'c0caf5' },
    { token: 'variable.language', foreground: 'f7768e' },
    { token: 'variable.other.constant', foreground: 'ff9e64' },
    { token: 'function', foreground: '7aa2f7' },
    { token: 'function.builtin', foreground: '7aa2f7' },
    { token: 'type', foreground: 'e0af68' },
    { token: 'type.builtin', foreground: 'e0af68' },
    { token: 'class', foreground: 'e0af68' },
    { token: 'operator', foreground: '89ddff' },
    { token: 'punctuation', foreground: 'a9b1d6' },
    { token: 'tag', foreground: 'f7768e' },
    { token: 'attribute.name', foreground: 'e0af68' },
    { token: 'attribute.value', foreground: '9ece6a' },
  ],
  colors: {
    'editor.background': '#0f172a',
    'editor.foreground': '#a9b1d6',
    'editor.lineHighlightBackground': '#1e293b',
    'editor.selectionBackground': '#334155',
    'editor.inactiveSelectionBackground': '#33415580',
    'editorCursor.foreground': '#c0caf5',
    'editorWhitespace.foreground': '#334155',
    'editorLineNumber.foreground': '#64748b',
    'editorLineNumber.activeForeground': '#94a3b8',
    'editorGutter.background': '#0f172a',
    'diffEditor.insertedTextBackground': '#2d4a3e',
    'diffEditor.removedTextBackground': '#4a2d2d',
    'diffEditor.insertedLineBackground': '#2d4a3e60',
    'diffEditor.removedLineBackground': '#4a2d2d60',
    'diffEditor.diagonalFill': '#334155',
  },
};

// Light theme
const lightTheme = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '24292f', background: 'ffffff' },
    { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cf222e' },
    { token: 'string', foreground: '0a3069' },
    { token: 'number', foreground: '0550ae' },
    { token: 'function', foreground: '8250df' },
    { token: 'type', foreground: '953800' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#24292f',
    'editor.lineHighlightBackground': '#f6f8fa',
    'editor.selectionBackground': '#b4d5fe',
    'editorLineNumber.foreground': '#8c959f',
    'editorGutter.background': '#ffffff',
    'diffEditor.insertedTextBackground': '#d1f4d9',
    'diffEditor.removedTextBackground': '#ffebe9',
    'diffEditor.insertedLineBackground': '#d1f4d960',
    'diffEditor.removedLineBackground': '#ffebe960',
    'diffEditor.diagonalFill': '#d0d7de',
  },
};

// Define themes
function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme('tokyo-night', tokyoNightTheme);
  monaco.editor.defineTheme('app-light', lightTheme);
}

interface GitDiffPreviewProps {
  fileName: string;
  originalContent: string;
  modifiedContent: string;
  onClose: () => void;
  className?: string;
}

function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    pyw: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    h: 'c',
    hpp: 'cpp',
    swift: 'swift',
    m: 'objective-c',
    mm: 'objective-cpp',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    kt: 'kotlin',
    kts: 'kotlin',
    scala: 'scala',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    json: 'json',
    jsonc: 'jsonc',
    jsonl: 'json',
    md: 'markdown',
    markdown: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    toml: 'ini',
    ini: 'ini',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    html: 'html',
    htm: 'html',
    vue: 'html',
    svelte: 'html',
    sql: 'sql',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    gitignore: 'ignore',
    proto: 'protobuf',
    lua: 'lua',
    perl: 'perl',
    pl: 'perl',
    r: 'r',
    dart: 'dart',
    groovy: 'groovy',
    plist: 'xml',
    storyboard: 'xml',
    xib: 'xml',
    log: 'plaintext',
  };
  return languageMap[ext] || 'plaintext';
}

export function GitDiffPreview({
  fileName,
  originalContent,
  modifiedContent,
  onClose,
  className,
}: GitDiffPreviewProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [theme, setTheme] = useState<'tokyo-night' | 'app-light'>('tokyo-night');
  const language = useMemo(() => getLanguage(fileName), [fileName]);

  // Calculate actual diff statistics (additions and deletions)
  const diffStats = useMemo(() => {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');

    // Use a simple LCS-based diff to count additions and deletions
    const lcs: number[][] = Array(originalLines.length + 1)
      .fill(null)
      .map(() => Array(modifiedLines.length + 1).fill(0));

    for (let i = 1; i <= originalLines.length; i++) {
      for (let j = 1; j <= modifiedLines.length; j++) {
        if (originalLines[i - 1] === modifiedLines[j - 1]) {
          lcs[i][j] = lcs[i - 1][j - 1] + 1;
        } else {
          lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
        }
      }
    }

    // Backtrack to find additions and deletions
    let i = originalLines.length;
    let j = modifiedLines.length;
    let additions = 0;
    let deletions = 0;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
        additions++;
        j--;
      } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
        deletions++;
        i--;
      }
    }

    return { additions, deletions };
  }, [originalContent, modifiedContent]);

  // Refs for editor and container
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const monacoRef = useRef<Monaco | null>(null);

  // Watch for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const newTheme = getCurrentTheme();
      setTheme(newTheme === 'dark' ? 'tokyo-night' : 'app-light');
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Track if content has changed (for triggering hideUnchangedRegions)
  const contentChangedRef = useRef(false);
  const prevContentRef = useRef({ original: originalContent, modified: modifiedContent });

  useEffect(() => {
    const prev = prevContentRef.current;
    if (prev.original !== originalContent || prev.modified !== modifiedContent) {
      contentChangedRef.current = true;
      prevContentRef.current = { original: originalContent, modified: modifiedContent };
      // Show loading when content changes (switching files)
      if (isEditorReady) {
        setIsTransitioning(true);
      }
    }
  }, [originalContent, modifiedContent, isEditorReady]);

  // Helper to apply hideUnchangedRegions
  const applyHideUnchangedRegions = useCallback(() => {
    if (!editorRef.current) return;

    // Toggle the option off and on to force re-evaluation
    editorRef.current.updateOptions({
      hideUnchangedRegions: {
        enabled: false,
      },
    });

    // Use setTimeout to ensure the update takes effect
    setTimeout(() => {
      editorRef.current?.updateOptions({
        hideUnchangedRegions: {
          enabled: true,
          contextLineCount: 3,
          minimumLineCount: 2,
          revealLineCount: 5,
        },
      });
      // Hide loading after folding is applied (with small delay for render)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 0);
  }, []);

  // ResizeObserver to handle container size changes
  useEffect(() => {
    if (!containerRef.current || !editorRef.current || !isEditorReady) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        editorRef.current?.layout({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isEditorReady]);

  return (
    <div className={cn('flex flex-col h-full w-full min-w-0 bg-card border-l border-primary-border', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-muted shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GitCompare className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate text-primary" title={fileName}>
              {fileName}
            </p>
            <p className="text-[10px] text-primary/70 truncate">
              {diffStats.deletions > 0 && (
                <span className="text-red-500">-{diffStats.deletions} lines</span>
              )}
              {diffStats.deletions > 0 && diffStats.additions > 0 && ' → '}
              {diffStats.additions > 0 && (
                <span className="text-green-500">+{diffStats.additions} lines</span>
              )}
              {diffStats.deletions === 0 && diffStats.additions === 0 && (
                <span>{t('contextPanel.noChanges', 'No changes')}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary-light rounded-md transition-colors"
            title="Close diff"
          >
            <X className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative min-h-0 min-w-0 w-full overflow-hidden">
        <DiffEditor
          height="100%"
          width="100%"
          original={originalContent}
          modified={modifiedContent}
          language={language}
          theme={theme}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            wordWrap: 'on',
            automaticLayout: true,
            folding: true,
            lineHeight: 1.6,
            padding: { top: 12, bottom: 12 },
            fixedOverflowWidgets: true,
            overviewRulerBorder: false,
            renderSideBySide: true,
            diffWordWrap: 'on',
            renderOverviewRuler: false,
            diffAlgorithm: 'advanced',
            ignoreTrimWhitespace: false,
            hideUnchangedRegions: {
              enabled: true,
              contextLineCount: 3,
              minimumLineCount: 2,
              revealLineCount: 5,
            },
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            defineThemes(monaco);

            // Apply current theme immediately to ensure correct initial theme
            const currentTheme = getCurrentTheme();
            monaco.editor.setTheme(currentTheme === 'dark' ? 'tokyo-night' : 'app-light');

            setIsLoading(false);
            setIsEditorReady(true);
            // Store initial content
            prevContentRef.current = { original: originalContent, modified: modifiedContent };

            // Listen for diff updates and apply hideUnchangedRegions
            editor.onDidUpdateDiff(() => {
              if (contentChangedRef.current) {
                contentChangedRef.current = false;
                applyHideUnchangedRegions();
              }
            });

            setTimeout(() => {
              editor.layout();
            }, 100);
          }}
          loading={null}
        />

        {/* Loading overlay - placed after DiffEditor to ensure it's on top */}
        {(isLoading || isTransitioning) && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-primary">
                {isTransitioning ? t('contextPanel.updatingDiff') : t('contextPanel.loadingDiff')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
