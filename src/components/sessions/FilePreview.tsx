/**
 * File Preview Component
 *
 * Shiki-based read-only file viewer with VS Code-level syntax highlighting
 * Uses the same TextMate grammar as VS Code
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Image, FileCode, FileX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shiki imports
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

// Import WASM file statically (fix for Neutralino)
import shikiWasm from 'shiki/wasm';

// Import only common languages (JavaScript, TypeScript, Markdown, Kotlin, Go, Rust)
import javascript from 'shiki/dist/langs/javascript.mjs';
import typescript from 'shiki/dist/langs/typescript.mjs';
import markdown from 'shiki/dist/langs/markdown.mjs';
import kotlin from 'shiki/dist/langs/kotlin.mjs';
import go from 'shiki/dist/langs/go.mjs';
import rust from 'shiki/dist/langs/rust.mjs';

// Import themes
import tokyoNight from 'shiki/dist/themes/tokyo-night.mjs';
import githubLight from 'shiki/dist/themes/github-light.mjs';

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

// Language mapping from file extension to Shiki language
// Only common languages are supported (others will use 'text' fallback)
const languageMap: Record<string, string> = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  // Markdown
  'md': 'markdown',
  'markdown': 'markdown',
  // Kotlin
  'kt': 'kotlin',
  'kts': 'kotlin',
  // Go
  'go': 'go',
  // Rust
  'rs': 'rust',
};

// Special file names to language mapping
const specialFileMap: Record<string, string> = {
  // All special files will use 'text' fallback
};

// Get Shiki language from file name
function getLanguage(fileName: string): string {
  const baseName = fileName.toLowerCase().split('/').pop() || '';

  // Check special files first
  if (specialFileMap[baseName]) {
    return specialFileMap[baseName];
  }

  if (baseName.startsWith('.env')) {
    return 'text';
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const lang = languageMap[ext] || 'text';
  console.log('[FilePreview] File:', fileName, 'Extension:', ext, 'Language:', lang);
  return lang;
}

// Global highlighter instance
let globalHighlighter: HighlighterCore | null = null;

// Initialize Shiki highlighter
async function getHighlighter(): Promise<HighlighterCore> {
  if (globalHighlighter) {
    return globalHighlighter;
  }

  const highlighter = await createHighlighterCore({
    themes: [tokyoNight, githubLight],
    langs: [
      javascript,
      typescript,
      markdown,
      kotlin,
      go,
      rust,
    ],
    engine: createOnigurumaEngine(shikiWasm),
  });

  globalHighlighter = highlighter;
  return highlighter;
}

// Generate line numbers HTML
function generateLineNumbers(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, i) =>
    `<div class="shiki-line-number">${i + 1}</div>`
  ).join('');
}

// Custom CSS for Shiki
const shikiStyles = `
  .shiki-wrapper {
    display: flex;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.6;
    overflow: auto;
  }
  .shiki-line-numbers {
    flex-shrink: 0;
    text-align: right;
    padding: 16px 12px 16px 16px;
    user-select: none;
    border-right: 1px solid;
  }
  .shiki-line-number {
    min-width: 2ch;
  }
  .shiki-code {
    flex: 1;
    padding: 16px;
    overflow-x: auto;
  }
  .shiki-code pre {
    margin: 0;
    white-space: pre;
    word-wrap: normal;
  }
  .shiki-code code {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  /* Make Shiki background transparent to match parent container */
  .shiki-wrapper.dark,
  .shiki-wrapper.dark .shiki-line-numbers {
    background: transparent;
    color: #565f89;
    border-color: #24283b;
  }
  .shiki-wrapper.dark .shiki,
  .shiki-wrapper.dark .shiki code {
    background: transparent !important;
  }

  .shiki-wrapper.light,
  .shiki-wrapper.light .shiki-line-numbers {
    background: transparent;
    color: #6e7781;
    border-color: #d0d7de;
  }
  .shiki-wrapper.light .shiki,
  .shiki-wrapper.light .shiki code {
    background: transparent !important;
  }
`;

export function FilePreview({
  fileName,
  content,
  onClose,
  className,
}: FilePreviewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Detect file type
  const fileType = getFileType(fileName);

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

  // Highlight code with Shiki
  const highlightCode = useCallback(async () => {
    if (fileType !== 'text') return;

    setIsLoading(true);
    try {
      const highlighter = await getHighlighter();
      const language = getLanguage(fileName);
      const theme = isDark ? 'tokyo-night' : 'github-light';

      const html = highlighter.codeToHtml(content, {
        lang: language,
        theme,
      });

      // Extract the inner code content and wrap with line numbers
      const lines = content.split('\n');
      const lineNumbersHtml = generateLineNumbers(lines.length);

      // Create the final HTML with line numbers
      const finalHtml = `
        <div class="shiki-wrapper ${isDark ? 'dark' : 'light'}">
          <div class="shiki-line-numbers">${lineNumbersHtml}</div>
          <div class="shiki-code">${html}</div>
        </div>
      `;

      setHighlightedCode(finalHtml);
    } catch (error) {
      console.error('Failed to highlight code:', error);
      // Fallback to plain text
      const lines = content.split('\n');
      const lineNumbersHtml = generateLineNumbers(lines.length);
      const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      setHighlightedCode(`
        <div class="shiki-wrapper ${isDark ? 'dark' : 'light'}">
          <div class="shiki-line-numbers">${lineNumbersHtml}</div>
          <div class="shiki-code"><pre><code>${escapedContent}</code></pre></div>
        </div>
      `);
    } finally {
      setIsLoading(false);
    }
  }, [content, fileName, fileType, isDark]);

  // Highlight code when dependencies change
  useEffect(() => {
    highlightCode();
  }, [highlightCode]);

  // Render content based on file type
  const renderContent = () => {
    if (fileType === 'image') {
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

    // Text file with Shiki highlighting
    return (
      <div className="flex-1 overflow-auto bg-background relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <style>{shikiStyles}</style>
            <div
              ref={containerRef}
              className="h-full"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </>
        )}
      </div>
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
