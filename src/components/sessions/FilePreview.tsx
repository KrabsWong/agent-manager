/**
 * File Preview Component
 *
 * CodeMirror 6 based read-only file viewer with theme support
 * Uses @codemirror/language-data for automatic language detection
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Image, FileCode, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';

// CodeMirror 6 imports
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

// Additional language imports for better support
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { xml } from '@codemirror/lang-xml';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';

interface FilePreviewProps {
  fileName: string;
  content: string;
  onClose: () => void;
  className?: string;
}

// File type detection
function getFileType(fileName: string): 'image' | 'text' | 'binary' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Images
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'];
  if (imageExts.includes(ext)) return 'image';
  
  // Binary files that we don't support
  const binaryExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'tar', 'gz', 'exe', 'dll', 'so', 'dylib', 'mp3', 'mp4', 'avi', 'mov', 'mkv'];
  if (binaryExts.includes(ext)) return 'binary';
  
  return 'text';
}

// Get MIME type for image
function getImageMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
  };
  return mimeTypes[ext] || 'image/png';
}

// Language alias mapping for better detection
const languageAliases: Record<string, string> = {
  'vue': 'html',
  'svelte': 'html',
  'astro': 'html',
  'md': 'markdown',
  'mdx': 'markdown',
  'markdown': 'markdown',
  'yml': 'yaml',
  'yaml': 'yaml',
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'fish': 'shell',
  'ps1': 'powershell',
  'psm1': 'powershell',
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'jenkinsfile': 'groovy',
  'gemfile': 'ruby',
  'rakefile': 'ruby',
  'vagrantfile': 'ruby',
  'podfile': 'ruby',
  'brewfile': 'ruby',
  'py': 'python',
  'pyw': 'python',
  'pyi': 'python',
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'jsx': 'jsx',
  'ts': 'typescript',
  'tsx': 'tsx',
  'rs': 'rust',
  'go': 'go',
  'php': 'php',
  'rb': 'ruby',
  'pl': 'perl',
  'lua': 'lua',
  'swift': 'swift',
  'kt': 'kotlin',
  'kts': 'kotlin',
  'sql': 'sql',
  'mysql': 'sql',
  'pgsql': 'sql',
  'plsql': 'sql',
  'c': 'cpp',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'h': 'cpp',
  'hpp': 'cpp',
  'java': 'java',
  'json': 'json',
  'xml': 'xml',
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'css',
  'sass': 'css',
  'less': 'css',
  'stylus': 'css',
};

// Get language extension for CodeMirror
async function getLanguageExtension(fileName: string): Promise<Extension> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const baseName = fileName.toLowerCase().split('/').pop() || '';
  
  // Special handling for files without extension or with special names
  const specialFiles: Record<string, () => Extension> = {
    'dockerfile': () => StreamLanguage.define(shell),
    'makefile': () => StreamLanguage.define(shell),
    'jenkinsfile': () => StreamLanguage.define(shell),
    'gemfile': () => StreamLanguage.define(shell),
    'rakefile': () => StreamLanguage.define(shell),
    'vagrantfile': () => StreamLanguage.define(shell),
    'podfile': () => StreamLanguage.define(shell),
    'brewfile': () => StreamLanguage.define(shell),
  };
  
  if (specialFiles[baseName]) {
    return specialFiles[baseName]();
  }
  
  // Check for .env files
  if (baseName.startsWith('.env')) {
    return StreamLanguage.define(shell);
  }
  
  // Try to find language from @codemirror/language-data
  const langName = languageAliases[ext] || ext;
  const lang = languages.find(l => l.name.toLowerCase() === langName.toLowerCase() || 
    l.extensions?.some(e => e.replace('.', '') === ext));
  
  if (lang) {
    try {
      const support = await lang.load();
      return support;
    } catch {
      // Fall through to manual mapping
    }
  }
  
  // Manual mapping for common languages (fallback)
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return javascript();
    case 'ts':
      return javascript({ typescript: true });
    case 'tsx':
      return javascript({ typescript: true, jsx: true });
    case 'jsx':
      return javascript({ jsx: true });
    case 'vue':
    case 'svelte':
    case 'astro':
      // Vue/Svelte use HTML syntax with special handling
      return html();
    case 'html':
    case 'htm':
      return html();
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return css();
    case 'py':
    case 'pyw':
    case 'pyi':
      return python();
    case 'json':
      return json();
    case 'yaml':
    case 'yml':
      return yaml();
    case 'xml':
    case 'svg':
    case 'plist':
      return xml();
    case 'md':
    case 'mdx':
    case 'markdown':
      return markdown();
    case 'cpp':
    case 'c':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
    case 'hh':
      return cpp();
    case 'java':
      return java();
    case 'rs':
      return rust();
    case 'go':
      return go();
    case 'php':
      return php();
    case 'sql':
    case 'mysql':
    case 'pgsql':
      return sql();
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return StreamLanguage.define(shell);
    default:
      return [];
  }
}

// Tokyo Night Theme for CodeMirror 6
// https://github.com/folke/tokyonight.nvim

// Tokyo Night Storm (Dark) - 使用更亮的颜色以在暗色背景下可见
const tokyoNightDark = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#c0caf5',
  },
  '.cm-content': {
    caretColor: '#c0caf5',
    backgroundColor: 'transparent',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#c0caf5',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#283457',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#565f89',
    borderRight: '1px solid #1f2335',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#292e42',
    color: '#a9b1d6',
  },
  '.cm-activeLine': {
    backgroundColor: '#292e42',
  },
  // Tokyo Night syntax highlighting
  '.cm-keyword': { color: '#bb9af7', fontWeight: 'bold' },
  '.cm-operator': { color: '#89ddff' },
  '.cm-variableName': { color: '#c0caf5' },
  '.cm-definition': { color: '#7aa2f7' },
  '.cm-string': { color: '#9ece6a' },
  '.cm-number': { color: '#ff9e64' },
  '.cm-comment': { color: '#565f89', fontStyle: 'italic' },
  '.cm-function': { color: '#7aa2f7' },
  '.cm-propertyName': { color: '#73daca' },
  '.cm-typeName': { color: '#e0af68' },
  '.cm-tag': { color: '#f7768e' },
  '.cm-attributeName': { color: '#e0af68' },
  '.cm-className': { color: '#e0af68' },
  '.cm-property': { color: '#73daca' },
  '.cm-punctuation': { color: '#89ddff' },
  '.cm-bracket': { color: '#a9b1d6' },
  '.cm-bool': { color: '#ff9e64' },
  '.cm-regexp': { color: '#b9f27c' },
  '.cm-special-variable': { color: '#bb9af7' },
}, { dark: true });

// Tokyo Night Day (Light)
const tokyoNightLight = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#3760bf',
  },
  '.cm-content': {
    caretColor: '#3760bf',
    backgroundColor: 'transparent',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#3760bf',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#b7c1e3',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#8c9add',
    borderRight: '1px solid #d5d6db',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#c6c8d1',
    color: '#506686',
  },
  '.cm-activeLine': {
    backgroundColor: '#c6c8d1',
  },
  // Tokyo Night Day syntax highlighting
  '.cm-keyword': { color: '#9854f1', fontWeight: 'bold' },
  '.cm-operator': { color: '#007197' },
  '.cm-variableName': { color: '#3760bf' },
  '.cm-definition': { color: '#2e7de9' },
  '.cm-string': { color: '#587539' },
  '.cm-number': { color: '#b15c00' },
  '.cm-comment': { color: '#848cb5', fontStyle: 'italic' },
  '.cm-function': { color: '#2e7de9' },
  '.cm-propertyName': { color: '#007197' },
  '.cm-typeName': { color: '#8c6c3e' },
  '.cm-tag': { color: '#f52a65' },
  '.cm-attributeName': { color: '#8c6c3e' },
  '.cm-className': { color: '#8c6c3e' },
  '.cm-property': { color: '#007197' },
  '.cm-punctuation': { color: '#007197' },
  '.cm-bracket': { color: '#5a6f89' },
  '.cm-bool': { color: '#b15c00' },
  '.cm-regexp': { color: '#387852' },
  '.cm-special-variable': { color: '#9854f1' },
}, { dark: false });

export function FilePreview({
  fileName,
  content,
  onClose,
  className,
}: FilePreviewProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  // Detect file type
  const fileType = useMemo(() => getFileType(fileName), [fileName]);
  
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

  // Initialize CodeMirror editor
  useEffect(() => {
    if (fileType !== 'text' || !editorRef.current) return;
    
    let isMounted = true;
    
    // Clean up previous instance
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // Async function to load language and create editor
    const initEditor = async () => {
      const langExtension = await getLanguageExtension(fileName);
      
      if (!isMounted || !editorRef.current) return;

      // Create theme based on current mode
      const customTheme = isDark ? tokyoNightDark : tokyoNightLight;

      // Build extensions
      const extensions: Extension[] = [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...defaultKeymap,
          ...searchKeymap,
        ]),
        EditorView.editable.of(false),
        // Syntax highlighting - this is the key!
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        langExtension,
        customTheme,
      ];

      // Create state
      const state = EditorState.create({
        doc: content,
        extensions,
      });

      // Create view
      if (editorRef.current) {
        viewRef.current = new EditorView({
          state,
          parent: editorRef.current,
        });
      }
    };

    initEditor();

    return () => {
      isMounted = false;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [content, fileName, fileType, isDark]);

  // Render content based on file type
  const renderContent = () => {
    if (fileType === 'image') {
      // Backend already returns data URL (data:image/xxx;base64,xxx)
      // but frontend might also try to wrap it, so we need to handle both cases
      const src = content.startsWith('data:') 
        ? content 
        : `data:${getImageMimeType(fileName)};base64,${content}`;
      
      return (
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 overflow-auto">
          <img 
            src={src} 
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onError={(e) => {
              console.error('Failed to load image:', fileName);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (fileType === 'binary') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <FileX className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            {t('preview.unsupportedFile', 'Unsupported File Format')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('preview.cannotPreview', 'This file format cannot be previewed')}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {fileName}
          </p>
        </div>
      );
    }

    // Text file - container has background, editor is transparent
    return (
      <div 
        ref={editorRef} 
        className="flex-1 overflow-auto bg-background [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-editor]:bg-transparent"
      />
    );
  };

  return (
    <div className={cn('flex flex-col h-full w-full min-w-0 bg-card border-l border-primary-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-muted shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {fileType === 'image' ? (
            <Image className="h-4 w-4 text-primary flex-shrink-0" />
          ) : fileType === 'binary' ? (
            <FileX className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate text-primary" title={fileName}>
              {fileName}
            </p>
            {fileType === 'text' && (
              <p className="text-[10px] text-primary/70">
                {content.split('\n').length} {t('diff.lines', 'lines')}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-primary-light rounded-md transition-colors"
          title="Close preview"
        >
          <X className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
