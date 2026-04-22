/**
 * Conversation View Component
 *
 * Renders a conversation session with support for:
 * - User messages
 * - Assistant responses (implied between tool_use and tool_result)
 * - Tool calls (tool_use)
 * - Tool results (tool_result)
 * - MCP calls and sub-agent calls (identified by tool_name patterns)
 */

import { useMemo, useState, memo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useExperienceStore } from '@/stores/experience';
import * as Diff from 'diff';
import mermaid from 'mermaid';
import {
  User,
  Wrench,
  Terminal,
  Puzzle,
  Bot,
  FileText,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Sparkles,
  Info,
  Folder,
  ListTodo,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { CSSProperties } from 'react';

// Tokyo Night 主题配色
const tokyoNightTheme: { [key: string]: CSSProperties } = {
  'code[class*="language-"]': {
    color: '#a9b1d6',
    background: 'transparent',
    fontFamily:
      "'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
  },
  'pre[class*="language-"]': {
    color: '#a9b1d6',
    background: '#1a1b26',
    fontFamily:
      "'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    padding: '1rem',
    margin: 0,
    overflow: 'auto',
    borderRadius: '0.375rem',
  },
  comment: { color: '#565f89', fontStyle: 'italic' },
  prolog: { color: '#565f89' },
  doctype: { color: '#565f89' },
  cdata: { color: '#565f89' },
  punctuation: { color: '#7aa2f7' },
  property: { color: '#73daca' },
  tag: { color: '#f7768e' },
  boolean: { color: '#ff9e64' },
  number: { color: '#ff9e64' },
  constant: { color: '#ff9e64' },
  symbol: { color: '#ff9e64' },
  deleted: { color: '#f7768e' },
  selector: { color: '#9ece6a' },
  'attr-name': { color: '#e0af68' },
  string: { color: '#9ece6a' },
  char: { color: '#9ece6a' },
  builtin: { color: '#bb9af7' },
  inserted: { color: '#9ece6a' },
  operator: { color: '#bb9af7' },
  entity: { color: '#7aa2f7', cursor: 'help' },
  url: { color: '#73daca' },
  variable: { color: '#f7768e' },
  atrule: { color: '#e0af68' },
  'attr-value': { color: '#9ece6a' },
  function: { color: '#7aa2f7' },
  'class-name': { color: '#e0af68' },
  keyword: { color: '#bb9af7' },
  regex: { color: '#e0af68' },
  important: { color: '#f7768e', fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};
import { getAppIcon, APP_LABELS } from '@/components/AppIcons';
import { cn } from '@/lib/utils';
import { parseMessageContent, hasSpecialParser, type ParsedContent } from './parsers';
import { SubAgentCard } from './SubAgentCard';
import { HighlightedText } from './HighlightedText';
import type { AppType } from '@/types';
import type { SessionMessage } from '@/types/session';

// Constants for performance optimization
const MAX_CODE_LINES = 100; // 代码块超过此行数默认折叠
const CODE_LINES_INCREMENT = 200; // 每次展开增加的代码行数
const MAX_SYNTAX_HIGHLIGHT_LINES = 500; // 超过此行数禁用语法高亮，避免卡顿
const MAX_TEXT_LENGTH = 8000; // 文本超过此字符数默认截断

/**
 * Parse Claude Code XML output format
 * Handles <path>, <type>, <content> tags from tool results
 */
function parseClaudeCodeXML(content: string): Array<{
  type: 'file' | 'directory' | 'text';
  path?: string;
  content?: string;
  entries?: string[];
}> | null {
  // Check if this is Claude Code XML format
  if (!content.includes('<path>') || !content.includes('<type>')) {
    return null;
  }

  const results: Array<{
    type: 'file' | 'directory' | 'text';
    path?: string;
    content?: string;
    entries?: string[];
  }> = [];

  // Helper function to extract tag content - finds the FIRST closing tag
  const extractTag = (str: string, tagName: string): string | null => {
    const openTag = `<${tagName}>`;
    const closeTag = `</${tagName}>`;
    const startIdx = str.indexOf(openTag);
    if (startIdx === -1) return null;
    const contentStart = startIdx + openTag.length;
    // Find the FIRST occurrence of closeTag after the opening tag
    const endIdx = str.indexOf(closeTag, contentStart);
    if (endIdx === -1) return null;
    return str.substring(contentStart, endIdx);
  };

  // Find all path positions using regex to ensure we match actual XML tags
  // not content that happens to contain "<path>"
  const paths: Array<{ path: string; start: number }> = [];
  const pathRegex = /<path>([\s\S]*?)<\/path>/g;
  let match;

  while ((match = pathRegex.exec(content)) !== null) {
    const path = match[1];
    // Only accept paths that look like actual file paths (start with /)
    if (path.startsWith('/')) {
      paths.push({ path, start: match.index });
    }
  }

  // Helper to extract content after a specific position
  const extractContentAfter = (str: string, startPos: number): string | null => {
    const openTag = '<content>';
    const closeTag = '</content>';
    const openIdx = str.indexOf(openTag, startPos);
    if (openIdx === -1) return null;
    const contentStart = openIdx + openTag.length;
    const closeIdx = str.indexOf(closeTag, contentStart);
    if (closeIdx === -1) return null;
    return str.substring(contentStart, closeIdx);
  };

  const extractEntriesAfter = (str: string, startPos: number): string | null => {
    const openTag = '<entries>';
    const closeTag = '</entries>';
    const openIdx = str.indexOf(openTag, startPos);
    if (openIdx === -1) return null;
    const contentStart = openIdx + openTag.length;
    const closeIdx = str.indexOf(closeTag, contentStart);
    if (closeIdx === -1) return null;
    return str.substring(contentStart, closeIdx);
  };

  // Process each path with its corresponding segment
  for (let i = 0; i < paths.length; i++) {
    const { path, start } = paths[i];
    // Segment ends at the next path or end of content
    const end = i < paths.length - 1 ? paths[i + 1].start : content.length;
    const segment = content.substring(start, end);

    const type = extractTag(segment, 'type');

    if (type === 'file') {
      // Look for content that comes after this file's <type> tag
      const typePos = segment.indexOf('<type>file</type>');
      const fileContent = extractContentAfter(segment, typePos);
      if (fileContent !== null) {
        results.push({
          type: 'file',
          path,
          content: fileContent,
        });
      }
    } else if (type === 'directory') {
      const typePos = segment.indexOf('<type>directory</type>');
      const entriesContent = extractEntriesAfter(segment, typePos);
      if (entriesContent !== null) {
        const entries = entriesContent
          .trim()
          .split('\n')
          .filter((e) => e.trim());
        results.push({
          type: 'directory',
          path,
          entries,
        });
      }
    } else if (type) {
      results.push({
        type: 'text',
        path,
      });
    }
  }

  return results.length > 0 ? results : null;
}

// Custom components for ReactMarkdown to handle code blocks with syntax highlighting
const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const content = String(children);

    // Treat as inline code if:
    // 1. inline prop is true, OR
    // 2. content has no newlines (single line code should be inline)
    if (inline || !content.includes('\n')) {
      return (
        <code className="bg-primary-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }

    // Handle Mermaid diagrams
    if (language === 'mermaid') {
      return <MermaidDiagram content={content} />;
    }

    // Use collapsible code block for large code
    return <CollapsibleCodeBlock content={content} language={language} />;
  },
};

/**
 * Mermaid Diagram Component - Renders Mermaid syntax as SVG diagrams
 */
interface MermaidDiagramProps {
  content: string;
}

function MermaidDiagram({ content }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const renderedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate renders
    if (renderedRef.current) return;
    renderedRef.current = true;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Initialize mermaid with theme support
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render with timeout to prevent hanging
        const renderPromise = mermaid.render(id, content.trim());
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Render timeout')), 10000);
        });

        const { svg: renderedSvg } = await Promise.race([renderPromise, timeoutPromise]) as { svg: string };
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [content]);

  // Show raw code if user clicks the button while loading
  if (showRaw) {
    return (
      <div className="rounded-md border border-primary-border bg-primary-muted">
        <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-light">
          <span className="text-xs text-primary">Mermaid (Raw)</span>
          <button
            onClick={() => setShowRaw(false)}
            className="text-xs text-primary hover:text-primary-hover underline"
          >
            Try render
          </button>
        </div>
        <pre className="p-3 text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  // Handle theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Re-render when theme changes
          const isDark = document.documentElement.classList.contains('dark');
          mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'strict',
          });
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-md border border-primary-border bg-primary-muted p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
          <button
            onClick={() => setShowRaw(true)}
            className="text-xs text-primary hover:text-primary-hover underline"
          >
            View raw
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
        <div className="flex items-start gap-2">
          <span className="text-destructive text-sm font-medium">Failed to render Mermaid diagram:</span>
        </div>
        <pre className="mt-2 text-xs text-destructive/80 overflow-auto">{error}</pre>
        <div className="mt-3 pt-3 border-t border-destructive/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Original syntax:</span>
            <button
              onClick={() => {
                renderedRef.current = false;
                setError('');
                setIsLoading(true);
                // Trigger re-render
                const timer = setTimeout(() => {
                  const renderDiagram = async () => {
                    try {
                      mermaid.initialize({
                        startOnLoad: false,
                        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
                        securityLevel: 'loose',
                      });
                      const id = `mermaid-retry-${Math.random().toString(36).substr(2, 9)}`;
                      const { svg: renderedSvg } = await mermaid.render(id, content.trim());
                      setSvg(renderedSvg);
                      setIsLoading(false);
                    } catch (err) {
                      console.error('Mermaid retry error:', err);
                      setError(err instanceof Error ? err.message : 'Failed to render diagram');
                      setIsLoading(false);
                    }
                  };
                  renderDiagram();
                }, 100);
                return () => clearTimeout(timer);
              }}
              className="text-xs text-primary hover:underline"
            >
              Retry
            </button>
          </div>
          <pre className="text-xs text-muted-foreground overflow-auto">{content}</pre>
        </div>
      </div>
    );
  }

  return (
    <MermaidDiagramWithZoom svg={svg} />
  );
}

/**
 * Mermaid Diagram with Zoom Controls
 */
interface MermaidDiagramWithZoomProps {
  svg: string;
}

function MermaidDiagramWithZoom({ svg }: MermaidDiagramWithZoomProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const svgDimensionsRef = useRef({ width: 0, height: 0 });

  // Calculate scale to fit container (object-fit: contain behavior)
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current) return;

    // Parse SVG dimensions if not already cached
    if (svgDimensionsRef.current.width === 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (svgElement) {
        let svgWidth = svgElement.viewBox?.baseVal?.width ||
                      parseFloat(svgElement.getAttribute('width') || '0');
        let svgHeight = svgElement.viewBox?.baseVal?.height ||
                       parseFloat(svgElement.getAttribute('height') || '0');

        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox && (!svgWidth || !svgHeight)) {
          const parts = viewBox.split(' ').map(Number);
          if (parts.length === 4) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        }

        svgDimensionsRef.current = { width: svgWidth, height: svgHeight };
      }
    }

    const { width: svgWidth, height: svgHeight } = svgDimensionsRef.current;

    if (svgWidth && svgHeight && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      // Calculate scale to fit (contain behavior)
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const fitScale = Math.min(scaleX, scaleY);

      setScale(fitScale);
      // Center the diagram
      const scaledWidth = svgWidth * fitScale;
      const scaledHeight = svgHeight * fitScale;
      setPosition({
        x: (containerWidth - scaledWidth) / 2,
        y: (containerHeight - scaledHeight) / 2,
      });
    }
  }, [svg]);

  useEffect(() => {
    svgDimensionsRef.current = { width: 0, height: 0 };
    calculateFitScale();
    window.addEventListener('resize', calculateFitScale);
    return () => window.removeEventListener('resize', calculateFitScale);
  }, [calculateFitScale]);

  const handleZoomIn = () => setScale((s) => s * 1.2);
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.2, 0.1));
  const handleReset = useCallback(() => {
    calculateFitScale();
  }, [calculateFitScale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(Math.max(s * delta, 0.1), 5));
    }
  };

  return (
    <div className="rounded-md border border-primary-border bg-background">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary-border bg-primary-muted">
        <span className="text-xs text-primary">Mermaid Diagram</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-primary-light text-primary transition-colors"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-primary min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-primary-light text-primary transition-colors"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleReset}
            className="ml-2 px-2 py-1 text-xs rounded hover:bg-primary-light transition-colors text-primary"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Diagram Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden cursor-grab active:cursor-grabbing bg-primary-muted/30"
        style={{ height: '500px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={contentRef}
          className="origin-top-left"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Hint */}
      <div className="px-3 py-1.5 border-t border-primary-border bg-primary-muted">
        <span className="text-[10px] text-primary">
          Drag to pan • Ctrl/Cmd + scroll to zoom
        </span>
      </div>
    </div>
  );
}

/**
 * Collapsible Code Block - Performance optimization for large code blocks
 * Uses incremental loading to avoid UI freezing on large files
 */
interface CollapsibleCodeBlockProps {
  content: string;
  language: string;
}

function CollapsibleCodeBlock({ content, language }: CollapsibleCodeBlockProps) {
  const [displayedLines, setDisplayedLines] = useState(MAX_CODE_LINES);
  const codeBlockRef = useRef<HTMLDivElement>(null);
  const prevDisplayedLinesRef = useRef(displayedLines);
  const lines = content.split('\n');
  const totalLines = lines.length;
  const shouldCollapse = totalLines > MAX_CODE_LINES;
  const isFullyExpanded = displayedLines >= totalLines;
  const shouldHighlight = totalLines <= MAX_SYNTAX_HIGHLIGHT_LINES;

  // Calculate current display lines
  const currentDisplayLines = shouldCollapse ? Math.min(displayedLines, totalLines) : totalLines;
  const displayContent = lines.slice(0, currentDisplayLines).join('\n').replace(/\n$/, '');

  // Auto-scroll to bottom when loading more content
  useEffect(() => {
    if (
      codeBlockRef.current &&
      displayedLines > prevDisplayedLinesRef.current &&
      displayedLines > MAX_CODE_LINES
    ) {
      const element = codeBlockRef.current;
      element.scrollTop = element.scrollHeight;
    }
    prevDisplayedLinesRef.current = displayedLines;
  }, [displayedLines]);

  const handleCollapse = () => {
    setDisplayedLines(MAX_CODE_LINES);
    // Scroll back to top when collapsing
    if (codeBlockRef.current) {
      codeBlockRef.current.scrollTop = 0;
    }
  };

  // Determine if we should use incremental loading (only for highlighted code)
  const useIncrementalLoad = shouldHighlight;

  const handleExpand = () => {
    if (useIncrementalLoad) {
      // For highlighted code: load incrementally to avoid freezing
      setDisplayedLines((prev) => Math.min(prev + CODE_LINES_INCREMENT, totalLines));
    } else {
      // For non-highlighted large code: load all at once (it's fast without highlighting)
      setDisplayedLines(totalLines);
    }
  };

  return (
    <div className="relative">
      {!shouldHighlight && (
        <div className="absolute top-0 right-0 z-10 px-2 py-1 text-[10px] text-primary bg-primary-muted rounded-bl border-l border-b border-primary-border">
          已禁用高亮 ({totalLines} 行)
        </div>
      )}
      <div ref={codeBlockRef} className="overflow-auto max-h-[600px] rounded-md border border-primary-border">
        {shouldHighlight ? (
          <SyntaxHighlighter
            language={language}
            style={tokyoNightTheme}
            className="rounded-md text-sm !m-0"
          >
            {displayContent}
          </SyntaxHighlighter>
        ) : (
          <pre className="rounded-md text-sm bg-[#1a1b26] text-[#a9b1d6] p-4 overflow-auto font-mono leading-relaxed">
            <code>{displayContent}</code>
          </pre>
        )}
      </div>
      {shouldCollapse && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 bg-gradient-to-t from-[#1a1b26] to-transparent">
          <button
            onClick={isFullyExpanded ? handleCollapse : handleExpand}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-muted/80 hover:bg-primary-muted text-xs font-medium text-primary hover:text-primary-hover transition-colors border border-primary-border/50 shadow-sm"
          >
            {isFullyExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                收起代码
              </>
            ) : useIncrementalLoad ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                加载更多 ({currentDisplayLines}/{totalLines} 行)
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                展开全部 ({totalLines} 行)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Group messages into turns and count messages per turn
 * @param messages - Array of session messages
 * @param appType - Application type (e.g., 'claude', 'codebuddy')
 */
function groupMessagesIntoTurns(messages: SessionMessage[], appType?: string): MessageTurn[] {
  const turns: MessageTurn[] = [];
  let currentTurn: MessageTurn | null = null;
  let pendingToolCalls: SessionMessage[] = [];

  // Claude Code specific: tool_result outputs are used as assistant messages
  // Also, multiple consecutive assistant messages belong to the same turn
  const isClaudeCode = appType === 'claude';

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    switch (message.type) {
      case 'user':
        // Start a new turn
        if (currentTurn) {
          turns.push(currentTurn);
        }
        currentTurn = {
          userMessage: message,
          toolCalls: [],
          assistantMessage: null,
          systemMessages: [],
        };
        pendingToolCalls = [];
        break;

      case 'system':
        // Add system message to current turn or create a new system-only turn
        if (currentTurn) {
          currentTurn.systemMessages.push(message);
        } else {
          // Create a system-only turn (for messages before first user message)
          currentTurn = {
            userMessage: null,
            toolCalls: [],
            assistantMessage: null,
            systemMessages: [message],
          };
        }
        break;

      case 'tool_use':
        // Add to current turn's tool calls
        if (currentTurn) {
          pendingToolCalls.push(message);
          currentTurn.toolCalls.push({
            toolUse: message,
            toolResult: null,
          });
        } else {
          // No current turn - create a tool-only turn (orphaned tool call)
          turns.push({
            userMessage: null,
            toolCalls: [{ toolUse: message, toolResult: null }],
            assistantMessage: null,
            systemMessages: [],
          });
        }
        break;

      case 'tool_result':
        {
          // Try to find matching tool_use across all turns
          let matched = false;

          // First try to match in current turn
          if (currentTurn && pendingToolCalls.length > 0) {
            const pendingIndex = pendingToolCalls.findIndex(
              (tc) => tc.tool_name === message.tool_name
            );
            if (pendingIndex >= 0) {
              currentTurn.toolCalls[pendingIndex].toolResult = message;
              pendingToolCalls.splice(pendingIndex, 1);
              matched = true;
            } else {
              // Fallback: match by position (first unmatched tool call)
              const firstPending = currentTurn.toolCalls.find((tc) => !tc.toolResult);
              if (firstPending) {
                firstPending.toolResult = message;
                matched = true;
              }
            }
          }

          // If not matched in current turn, search in previous turns (orphaned tool calls)
          if (!matched) {
            for (const turn of turns) {
              const orphanedToolCall = turn.toolCalls.find(
                (tc) => tc.toolUse && !tc.toolResult && tc.toolUse.tool_name === message.tool_name
              );
              if (orphanedToolCall) {
                orphanedToolCall.toolResult = message;
                matched = true;
                break;
              }
              // Fallback: match by position if names don't match
              const firstOrphaned = turn.toolCalls.find((tc) => tc.toolUse && !tc.toolResult);
              if (firstOrphaned) {
                firstOrphaned.toolResult = message;
                matched = true;
                break;
              }
            }
          }

          // If still not matched, add to current turn or create orphaned turn
          if (!matched) {
            if (currentTurn) {
              currentTurn.toolCalls.push({ toolUse: null, toolResult: message });
            } else {
              turns.push({
                userMessage: null,
                toolCalls: [{ toolUse: null, toolResult: message }],
                assistantMessage: null,
                systemMessages: [],
              });
            }
          }

          // For Claude Code only: tool_result outputs are used as assistant messages
          if (isClaudeCode && message.tool_output && currentTurn) {
            const output = message.tool_output;
            let content = '';

            if (typeof output.output === 'string') {
              content = output.output;
            } else if (output.content && Array.isArray(output.content)) {
              content = output.content
                .filter((item: { type: string; text?: string }) => item.type === 'text')
                .map((item: { text?: string }) => item.text || '')
                .join('\n');
            }

            if (content) {
              // Append to existing assistant message or create new one
              if (currentTurn.assistantMessage) {
                currentTurn.assistantMessage.content += '\n\n' + content;
              } else {
                currentTurn.assistantMessage = {
                  type: 'assistant',
                  timestamp: message.timestamp,
                  content: content,
                };
              }
            }
          }
        }
        break;

      case 'assistant':
        if (currentTurn) {
          // Check if this is part of a multi-message assistant response
          // (common in Claude Code with thinking -> text -> tool_use sequence)
          const nextMessage = messages[i + 1];
          const isMultiMessageTurn =
            isClaudeCode &&
            nextMessage &&
            (nextMessage.type === 'assistant' || nextMessage.type === 'tool_use');

          if (currentTurn.assistantMessage) {
            // Merge with existing assistant message
            if (message.reasoning_content) {
              currentTurn.assistantMessage.reasoning_content = message.reasoning_content;
            }
            if (message.content) {
              currentTurn.assistantMessage.content = message.content;
            }
          } else {
            // First assistant message in this turn
            currentTurn.assistantMessage = message;
          }

          // Only end the turn if next message is user or end of messages
          if (!isMultiMessageTurn) {
            turns.push(currentTurn);
            currentTurn = null;
          }
        } else {
          // No current turn - create an assistant-only turn (for messages before first user message)
          turns.push({
            userMessage: null,
            toolCalls: [],
            assistantMessage: message,
            systemMessages: [],
          });
        }
        break;
    }
  }

  // Add any remaining turn
  if (currentTurn) {
    turns.push(currentTurn);
  }

  return turns;
}

interface MessageTurn {
  userMessage: SessionMessage | null;
  toolCalls: { toolUse: SessionMessage | null; toolResult: SessionMessage | null }[];
  assistantMessage: SessionMessage | null;
  systemMessages: SessionMessage[];
}

// Constants for message pagination
const MAX_MESSAGES_PER_BATCH = 100; // 每次加载的最大原始消息条数

interface MessageTurnWithCount extends MessageTurn {
  messageCount: number; // 这轮对话包含的原始消息数量
}

/**
 * Group messages into turns and count messages per turn
 * @param messages - Array of session messages
 * @param appType - Application type (e.g., 'claude', 'codebuddy')
 */
function groupMessagesIntoTurnsWithCount(
  messages: SessionMessage[],
  appType?: string
): MessageTurnWithCount[] {
  const turns = groupMessagesIntoTurns(messages, appType);
  return turns.map((turn) => {
    let messageCount = 0;
    if (turn.userMessage) messageCount++;
    // Count actual tool messages (tool_use and tool_result separately)
    for (const tc of turn.toolCalls) {
      if (tc.toolUse) messageCount++;
      if (tc.toolResult) messageCount++;
    }
    if (turn.assistantMessage) messageCount++;
    messageCount += turn.systemMessages.length;
    return { ...turn, messageCount };
  });
}

/**
 * Verify that turns message count matches original messages count
 */
function verifyMessageCount(
  turns: MessageTurnWithCount[],
  originalMessages: SessionMessage[],
  appType?: string
): void {
  const totalCount = turns.reduce((sum, t) => sum + t.messageCount, 0);
  if (totalCount !== originalMessages.length) {
    console.warn(
      `[ConversationView] Message count verification failed: turns total=${totalCount}, original=${originalMessages.length}, appType=${appType}`
    );
    // Log breakdown
    const typeCounts: Record<string, number> = {};
    for (const msg of originalMessages) {
      typeCounts[msg.type] = (typeCounts[msg.type] || 0) + 1;
    }
    console.warn('[ConversationView] Original messages breakdown:', typeCounts);
  }
}

interface ConversationViewProps {
  messages: SessionMessage[];
  className?: string;
  appType?: string;
  onLoadAll?: () => void;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
  onNewMessages?: (count: number, isAtBottom: boolean) => void;
  shouldLoadAll?: boolean;
  onLoadAllComplete?: () => void;
}

export function ConversationView({
  messages,
  className,
  appType = 'claude',
  onLoadAll,
  onViewSubAgentSession,
  searchQuery = '',
  onNewMessages,
  shouldLoadAll,
  onLoadAllComplete,
}: ConversationViewProps) {
  const turnsWithCount = useMemo(() => {
    const turns = groupMessagesIntoTurnsWithCount(messages, appType);
    verifyMessageCount(turns, messages, appType);
    return turns;
  }, [messages, appType]);
  const [displayedTurns, setDisplayedTurns] = useState<MessageTurnWithCount[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [remainingCount, setRemainingCount] = useState(0);

  // New content notification
  const prevMessagesLengthRef = useRef(messages.length);
  const prevLastMessageHashRef = useRef<string>('');

  // Track if user has loaded all content
  const hasLoadedAllRef = useRef(false);

  // Track if user is at bottom
  const isAtBottomRef = useRef(true);

  // Flag to trigger auto-scroll after DOM update
  const shouldAutoScrollRef = useRef(false);

  // Track last turn hash for detecting content changes within turns
  const prevLastTurnHashRef = useRef<string>('');

  // Helper to get turn hash for change detection
  const getTurnHash = (turn: MessageTurnWithCount | undefined): string => {
    if (!turn) return '';
    const userContent = turn.userMessage?.content || '';
    const assistantContent = turn.assistantMessage?.content || '';
    const reasoningContent = turn.assistantMessage?.reasoning_content || '';
    const toolCount = turn.toolCalls.length;
    return `${userContent.length}:${assistantContent.length}:${reasoningContent.length}:${toolCount}`;
  };

  // Helper to get message content hash for change detection
  const getMessageHash = (msg: SessionMessage | undefined): string => {
    if (!msg) return '';
    return `${msg.type}:${msg.content || ''}:${msg.reasoning_content || ''}:${JSON.stringify(msg.tool_output || {})}`;
  };

  // Auto-scroll to bottom
  const autoScrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = getScrollContainer();
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  // Initialize displayed turns based on message count limit
  useEffect(() => {
    // If user has loaded all content previously, keep showing all
    if (hasLoadedAllRef.current) {
      setDisplayedTurns(turnsWithCount);
      setHasMore(false);
      setRemainingCount(0);
      return;
    }

    let count = 0;
    let index = 0;
    const totalMessages = turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0);

    // Debug: verify message count consistency
    if (totalMessages !== messages.length) {
      console.warn(
        `[ConversationView] Message count mismatch: turns count=${totalMessages}, messages.length=${messages.length}`
      );
    }

    // Find how many turns we can display within the limit
    for (const turn of turnsWithCount) {
      if (count + turn.messageCount > MAX_MESSAGES_PER_BATCH && index > 0) {
        break;
      }
      count += turn.messageCount;
      index++;
    }

    setDisplayedTurns(turnsWithCount.slice(0, index));
    setHasMore(index < turnsWithCount.length);
    setRemainingCount(totalMessages - count);
  }, [turnsWithCount, messages.length]);

  const handleLoadMore = () => {
    const currentCount = displayedTurns.reduce((sum, t) => sum + t.messageCount, 0);
    let newCount = currentCount;
    let newIndex = displayedTurns.length;
    const totalMessages = turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0);

    // Add more turns until we hit the limit again
    for (let i = displayedTurns.length; i < turnsWithCount.length; i++) {
      const turn = turnsWithCount[i];
      if (
        newCount + turn.messageCount > currentCount + MAX_MESSAGES_PER_BATCH &&
        newIndex > displayedTurns.length
      ) {
        break;
      }
      newCount += turn.messageCount;
      newIndex++;
    }

    const newDisplayed = turnsWithCount.slice(0, newIndex);
    setDisplayedTurns(newDisplayed);
    setHasMore(newIndex < turnsWithCount.length);
    setRemainingCount(totalMessages - newCount);
  };

  const handleLoadAll = () => {
    hasLoadedAllRef.current = true;
    setDisplayedTurns(turnsWithCount);
    setHasMore(false);
    setRemainingCount(0);
    onLoadAll?.();
  };

  // Handle external load all request
  useEffect(() => {
    if (shouldLoadAll) {
      handleLoadAll();
      onLoadAllComplete?.();
    }
  }, [shouldLoadAll, handleLoadAll, onLoadAllComplete]);

  // Get the scroll container from parent (conversation-scroll-container)
  const getScrollContainer = () => {
    return document.getElementById('conversation-scroll-container');
  };

  // Track scroll position
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = container;
      const scrollBottom = Math.ceil(scrollTop + clientHeight);
      isAtBottomRef.current = scrollHeight - scrollBottom <= 50;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Detect new messages and content changes, trigger auto-scroll if at bottom
  useEffect(() => {
    const currentMessagesLength = messages.length;
    const prevMessagesLength = prevMessagesLengthRef.current;

    // Get last message hash for content change detection
    const lastMessage = messages[messages.length - 1];
    const currentLastMessageHash = getMessageHash(lastMessage);
    const prevLastMessageHash = prevLastMessageHashRef.current;

    // Case 1: New messages added
    if (currentMessagesLength > prevMessagesLength) {
      const newCount = currentMessagesLength - prevMessagesLength;

      // Mark that we should auto-scroll on next layout if user is at bottom
      if (isAtBottomRef.current) {
        shouldAutoScrollRef.current = true;
      }

      if (onNewMessages) {
        onNewMessages(newCount, isAtBottomRef.current);
      }
    }
    // Case 2: Last message content changed (streaming updates like thinking, tool results, etc.)
    else if (
      currentMessagesLength === prevMessagesLength &&
      currentMessagesLength > 0 &&
      currentLastMessageHash !== prevLastMessageHash
    ) {
      // Mark for auto-scroll if at bottom
      if (isAtBottomRef.current) {
        shouldAutoScrollRef.current = true;
      }
    }

    prevMessagesLengthRef.current = currentMessagesLength;
    prevLastMessageHashRef.current = currentLastMessageHash;
  }, [messages, onNewMessages]);

  // Auto-scroll when displayedTurns changes (detect both new turns and content updates)
  useEffect(() => {
    const currentTurnCount = displayedTurns.length;
    const lastTurn = displayedTurns[displayedTurns.length - 1];
    const currentLastTurnHash = getTurnHash(lastTurn);
    const prevLastTurnHash = prevLastTurnHashRef.current;

    // Determine if we should auto-scroll:
    // 1. Turn count increased (new user message)
    // 2. Last turn content changed (assistant reply, thinking update, tool result)
    const hasNewTurn = currentTurnCount > 0 && prevLastTurnHash !== '' && currentTurnCount >= (displayedTurns.length > 0 ? displayedTurns.length - 1 : 0);
    const hasContentUpdate = currentLastTurnHash !== prevLastTurnHash && prevLastTurnHash !== '';

    if (isAtBottomRef.current && (hasNewTurn || hasContentUpdate)) {
      // Use setTimeout to ensure DOM is fully updated after state change
      setTimeout(() => {
        autoScrollToBottom('smooth');
      }, 50);
    }

    prevLastTurnHashRef.current = currentLastTurnHash;
  }, [displayedTurns]);

  // Filter turns based on search
  const filteredTurns = useMemo(() => {
    if (!searchQuery.trim()) {
      return displayedTurns;
    }

    return displayedTurns.filter((turn) => {
      // Check user message
      if (
        turn.userMessage?.content &&
        turn.userMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      // Check assistant message
      if (
        turn.assistantMessage?.content &&
        turn.assistantMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      if (
        turn.assistantMessage?.reasoning_content &&
        turn.assistantMessage.reasoning_content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      // Check tool calls
      for (const tc of turn.toolCalls) {
        const toolContent = [
          tc.toolUse?.tool_name,
          tc.toolUse?.tool_input ? JSON.stringify(tc.toolUse.tool_input) : '',
          tc.toolResult?.tool_output ? JSON.stringify(tc.toolResult.tool_output) : '',
        ].join(' ');

        if (toolContent.toLowerCase().includes(searchQuery.toLowerCase())) {
          return true;
        }
      }

      // Check system messages
      for (const sysMsg of turn.systemMessages) {
        if (sysMsg.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return true;
        }
      }

      return false;
    });
  }, [displayedTurns, searchQuery]);

  // Note: match count is now calculated in parent component (SessionsPage)
  // and displayed in the search bar there

  const shouldPaginate = turnsWithCount.length > displayedTurns.length;

  return (
    <>
      <div className={cn('space-y-6 relative', className)}>
        {filteredTurns.map((turn, index) => (
          <ConversationTurn
            key={index}
            turn={turn}
            appType={appType}
            onViewSubAgentSession={onViewSubAgentSession}
            searchQuery={searchQuery}
          />
        ))}
        {/* Load more buttons at BOTTOM */}
        {shouldPaginate && hasMore && !searchQuery && (
          <div className="flex justify-center items-center gap-4 py-3">
            <button
              onClick={handleLoadMore}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              加载更多 ({remainingCount} 条)
            </button>
            <span className="text-border">|</span>
            <button
              onClick={handleLoadAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              加载全部
            </button>
          </div>
        )}
        {/* End of session indicator */}
        {!hasMore && displayedTurns.length > 0 && (
          <div className="flex justify-center py-4">
            <span className="text-xs text-muted-foreground/50">— 已加载全部内容 —</span>
          </div>
        )}
      </div>
    </>
  );
}

interface ConversationTurnProps {
  turn: MessageTurn;
  appType: string;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
}

const ConversationTurn = memo(function ConversationTurn({
  turn,
  appType,
  onViewSubAgentSession,
  searchQuery = '',
}: ConversationTurnProps) {
  return (
    <div className="space-y-3">
      {/* System Messages */}
      {turn.systemMessages.length > 0 && (
        <div className="space-y-1">
          {turn.systemMessages.map((sysMsg, index) => (
            <SystemMessage
              key={index}
              content={sysMsg.content || ''}
              timestamp={sysMsg.timestamp}
              metadata={sysMsg.metadata}
              model={sysMsg.model}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      {/* User Message */}
      {turn.userMessage?.content && (
        <UserMessage
          content={turn.userMessage.content}
          timestamp={turn.userMessage.timestamp}
          appType={appType}
          model={turn.userMessage.model}
          searchQuery={searchQuery}
        />
      )}

      {/* Agent Response */}
      {turn.toolCalls.length > 0 ? (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
        {getAppIcon(appType as AppType, 18)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{APP_LABELS[appType as AppType] || APP_LABELS.claude}</span>
          {turn.assistantMessage?.model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title="AI Model"
            >
              {turn.assistantMessage.model}
            </span>
          )}
        </div>
            <div className="space-y-2">
              {turn.toolCalls.map((toolCall, index) => (
                <ToolCallBlock
                  key={index}
                  toolUse={toolCall.toolUse}
                  toolResult={toolCall.toolResult}
                  onViewSubAgentSession={onViewSubAgentSession}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
            {(turn.assistantMessage?.content || turn.assistantMessage?.reasoning_content) && (
              <div className="mt-3">
                <AssistantMessage
                  hideAvatar
                  content={turn.assistantMessage.content || ''}
                  reasoningContent={turn.assistantMessage.reasoning_content}
                  timestamp={turn.assistantMessage.timestamp}
                  appType={appType}
                  model={turn.assistantMessage.model}
                  searchQuery={searchQuery}
                />
              </div>
            )}
          </div>
        </div>
      ) : (turn.assistantMessage?.content || turn.assistantMessage?.reasoning_content) ? (
        <AssistantMessage
          content={turn.assistantMessage.content || ''}
          reasoningContent={turn.assistantMessage.reasoning_content}
          timestamp={turn.assistantMessage.timestamp}
          appType={appType}
          model={turn.assistantMessage.model}
          searchQuery={searchQuery}
        />
      ) : null}
    </div>
  );
});

interface SystemMessageProps {
  content: string;
  timestamp: string;
  metadata?: { subtype?: string; command?: string };
  model?: string;
  searchQuery?: string;
}

const SystemMessage = memo(function SystemMessage({
  content,
  timestamp,
  metadata,
  model,
  searchQuery = '',
}: SystemMessageProps) {
  // Auto-detect subtype from content if not provided
  const detectSubtype = (): string | undefined => {
    if (metadata?.subtype) return metadata.subtype;

    // Check for pasted content indicator
    if (content.match(/\[Pasted ~?\d+ lines?\]/i)) {
      return 'pasted';
    }
    // Check for system reminder / caveat
    if (
      content.match(/system-reminder|caveat/i) ||
      content.includes('DO NOT respond to these messages')
    ) {
      return 'caveat';
    }
    // Check for command output
    if (content.match(/local-command-stdout|command-name/i)) {
      return 'command_output';
    }
    // Check for command input
    if (content.match(/^[\w-]+\s+\S+/)) {
      return 'command';
    }
    return undefined;
  };

  // Get icon and style based on subtype
  const getSubtypeConfig = () => {
    const subtype = detectSubtype();

    switch (subtype) {
      case 'caveat':
        return {
          icon: <Info className="h-3.5 w-3.5 text-amber-500" />,
          label: 'Caveat',
          bgColor: 'bg-amber-50/50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          textColor: 'text-amber-700 dark:text-amber-400',
        };
      case 'pasted':
        return {
          icon: <FileText className="h-3.5 w-3.5 text-green-500" />,
          label: 'Pasted',
          bgColor: 'bg-green-50/50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-400',
        };
      case 'command':
        return {
          icon: <Terminal className="h-3.5 w-3.5 text-purple-500" />,
          label: 'Command',
          bgColor: 'bg-purple-50/50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-700 dark:text-purple-400',
        };
      case 'command_output':
        return {
          icon: <Terminal className="h-3.5 w-3.5 text-gray-500" />,
          label: 'Command Output',
          bgColor: 'bg-gray-50/50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-400',
        };
      default:
        return {
          icon: <Info className="h-3.5 w-3.5 text-muted-foreground" />,
          label: 'System',
          bgColor: 'bg-primary-muted',
          borderColor: 'border-primary-border',
          textColor: 'text-muted-foreground',
        };
    }
  };

  const config = getSubtypeConfig();

  // Clean up content for display
  const cleanContent = content
    .replace(/\[Pasted ~?(\d+) lines?\]/gi, 'Pasted $1 lines')
    .replace(/<<?system-reminder>?>/gi, '')
    .replace(/<<?\/system-reminder>?>/gi, '')
    .replace(/<local-command-stdout>/gi, '')
    .replace(/<\/local-command-stdout>/gi, '')
    .replace(/<command-name>/gi, 'Command: ')
    .replace(/<\/command-name>/gi, '')
    .replace(/<local-command-stderr>/gi, 'Error: ')
    .replace(/<\/local-command-stderr>/gi, '')
    .trim();

  // Skip rendering if content is empty after cleaning
  if (!cleanContent) {
    return null;
  }

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-1.5">
        {config.icon}
        <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
        {model && (
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
            title="AI Model"
          >
            {model}
          </span>
        )}
        <span className="text-xs text-muted-foreground/60 ml-auto">
          {formatTimestamp(timestamp)}
        </span>
      </div>
      <div className={`px-3 pb-2 text-sm ${config.textColor} opacity-80`}>
        <HighlightedText text={cleanContent} query={searchQuery} />
      </div>
    </div>
  );
});

interface UserMessageProps {
  content: string;
  timestamp: string;
  appType?: string;
  model?: string;
  searchQuery?: string;
}

const UserMessage = memo(function UserMessage({
  content,
  timestamp,
  appType,
  model,
  searchQuery = '',
}: UserMessageProps) {
  // 检查是否需要特殊解析
  const needsSpecialParsing = hasSpecialParser(appType);
  const parsedContents = needsSpecialParsing
    ? parseMessageContent(content, appType)
    : [{ type: 'text' as const, content }];

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">You</span>
          {model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title="AI Model"
            >
              {model}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="bg-primary-muted rounded-lg p-3 text-sm space-y-2">
          {parsedContents.map((item, index) => (
            <ParsedContentBlock key={index} item={item} searchQuery={searchQuery} />
          ))}
        </div>
      </div>
    </div>
  );
});

interface ParsedContentBlockProps {
  item: ParsedContent;
  searchQuery?: string;
}

function ParsedContentBlock({ item, searchQuery: _searchQuery = '' }: ParsedContentBlockProps) {
  if (item.type === 'file') {
    return (
      <FileAttachment
        path={item.metadata?.path || ''}
        type={item.metadata?.type || ''}
        content={item.content}
      />
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_p]:overflow-wrap-anywhere [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto [&_*]:break-words [&_*]:overflow-wrap-anywhere">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {item.content}
      </ReactMarkdown>
    </div>
  );
}

interface FileAttachmentProps {
  path: string;
  type: string;
  content: string;
}

function FileAttachment({ path, type, content }: FileAttachmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileName = path.split('/').pop() || path;

  return (
    <div className="border rounded-md overflow-hidden bg-background/50">
      {/* File Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary-muted transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate">{fileName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">({type})</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">{path}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* File Content */}
      {isExpanded && (
        <div className="border-t">
          <div className="px-3 py-2 prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

interface AssistantMessageProps {
  content: string;
  reasoningContent?: string;
  timestamp: string;
  appType?: string;
  model?: string;
  searchQuery?: string;
  hideAvatar?: boolean;
}

const AssistantMessage = memo(function AssistantMessage({
  content,
  reasoningContent,
  timestamp,
  appType = 'claude',
  model,
  searchQuery = '',
  hideAvatar = false,
}: AssistantMessageProps) {
  const assistantName = APP_LABELS[appType as AppType] || APP_LABELS.claude;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const { showThinkingContent } = useExperienceStore();

  // Auto-expand reasoning only when this specific content matches search
  useEffect(() => {
    if (!searchQuery || !reasoningContent) return;

    const hasMatch = reasoningContent.toLowerCase().includes(searchQuery.toLowerCase());
    if (hasMatch) {
      setIsReasoningExpanded(true);
    }
  }, [searchQuery, reasoningContent]);

  // Auto-expand main content only when this specific content matches search
  useEffect(() => {
    if (searchQuery && content) {
      const hasMatch = content.toLowerCase().includes(searchQuery.toLowerCase());
      if (hasMatch) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, content]);

  // For Claude Code: parse XML before truncating to avoid breaking XML structure
  const parsedXML = useMemo(
    () => (appType === 'claude' ? parseClaudeCodeXML(content) : null),
    [content, appType]
  );

  // Only truncate if not displaying as XML (which handles its own overflow)
  const shouldTruncate = !parsedXML && content.length > MAX_TEXT_LENGTH;
  const displayContent =
    isExpanded || !shouldTruncate ? content : content.slice(0, MAX_TEXT_LENGTH) + '\n\n...';

  const contentSection = (
    <div
      className={content && reasoningContent && showThinkingContent ? 'space-y-2' : undefined}
    >
      {/* Reasoning / Thinking Block */}
      {reasoningContent && showThinkingContent && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 overflow-hidden">
          <button
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Thinking
            </span>
            <span className="text-xs text-amber-600/70 dark:text-amber-500/70 ml-auto">
              {isReasoningExpanded ? '收起' : '展开'}
            </span>
            {isReasoningExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
            )}
          </button>
          {isReasoningExpanded && (
            <div className="px-3 pb-3 text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto border-t border-amber-200/50 dark:border-amber-800/50 pt-2">
              {searchQuery ? (
                <HighlightedText text={reasoningContent} query={searchQuery} />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {reasoningContent}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
        {/* Check for Claude Code XML format */}
        {parsedXML && parsedXML.length > 0 ? (
          <ClaudeCodeXMLViewer data={parsedXML} />
        ) : (
          <>
            {searchQuery ? (
              <HighlightedText text={displayContent} query={searchQuery} />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {displayContent}
              </ReactMarkdown>
            )}
            {shouldTruncate && !isExpanded && !searchQuery && (
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-muted hover:bg-primary-light text-xs font-medium text-primary hover:text-primary-hover transition-colors border border-primary-border/50"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                展开全部 ({(content.length / 1000).toFixed(1)}K 字符)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (hideAvatar) {
    return contentSection;
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
        {getAppIcon(appType as AppType, 18)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{assistantName}</span>
          {model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title="AI Model"
            >
              {model}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        {contentSection}
      </div>
    </div>
  );
});

interface ToolCallBlockProps {
  toolUse: SessionMessage | null;
  toolResult: SessionMessage | null;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
}

interface ClaudeCodeXMLViewerProps {
  data: Array<{
    type: 'file' | 'directory' | 'text';
    path?: string;
    content?: string;
    entries?: string[];
  }>;
}

function ClaudeCodeXMLViewer({ data }: ClaudeCodeXMLViewerProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedItems(new Set(data.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const fileName = (path: string) => path.split('/').pop() || path;

  const getDisplayPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '.';

    parts.pop();

    if (parts.length > 3) {
      parts.splice(0, parts.length - 3);
    }

    return parts.join('/');
  };

  return (
    <div className="space-y-3">
      {data.length > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            全部展开
          </button>
          <span className="text-muted-foreground/30">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            全部收起
          </button>
        </div>
      )}

      {data.map((item, index) => {
        const isExpanded = expandedItems.has(index);
        const displayPath = getDisplayPath(item.path || '');

        return (
          <div
            key={index}
            className="rounded-lg border border-primary-border overflow-hidden bg-background/50"
          >
            <button
              onClick={() => toggleExpanded(index)}
              className="w-full flex items-center justify-between px-3 py-2 bg-primary-muted border-b hover:bg-primary-light transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.type === 'directory' ? (
                  <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{fileName(item.path || '')}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {item.type === 'directory' ? '目录' : '文件'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-xs text-muted-foreground/70 truncate max-w-[200px]"
                  title={item.path}
                >
                  {displayPath}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-primary" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t">
                {item.type === 'directory' && item.entries && (
                  <div className="px-3 py-2 text-sm">
                    <div className="text-muted-foreground text-xs mb-2">
                      ({item.entries.length} 个条目)
                    </div>
                    <div className="space-y-1">
                      {item.entries.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {entry.endsWith('/') ? (
                            <Folder className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span>{entry}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.type === 'file' && item.content && (
                  <div className="max-h-96 overflow-auto">
                    <CollapsibleCodeBlock
                      content={item.content}
                      language={getLanguageFromPath(item.path || '')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'jsx',
    tsx: 'tsx',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    sql: 'sql',
    xml: 'xml',
    dockerfile: 'dockerfile',
    env: 'bash',
  };
  return langMap[ext || ''] || 'text';
}

function ToolCallBlock({
  toolUse,
  toolResult,
  onViewSubAgentSession,
  searchQuery = '',
}: ToolCallBlockProps) {
  const { t } = useTranslation();
  const { collapseBashBlocks, showThinkingContent } = useExperienceStore();

  const toolName = toolUse?.tool_name || toolResult?.tool_name || 'unknown';
  const toolType = getToolType(toolName);

  // Thinking / Reasoning content state
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const reasoningContent = toolUse?.reasoning_content || toolResult?.reasoning_content;

  // Auto-expand only when this specific reasoning content matches search
  useEffect(() => {
    if (!searchQuery || !reasoningContent) return;

    const hasMatch = reasoningContent.toLowerCase().includes(searchQuery.toLowerCase());
    if (hasMatch) {
      setIsReasoningExpanded(true);
    }
  }, [searchQuery, reasoningContent]);

  // All tool calls are collapsible by default - this applies to ALL tool types
  // (bash, read, write, mcp, task planning, skills, terminal, etc.)
  // Previously used a whitelist approach which was hard to maintain
  const shouldDefaultCollapse = collapseBashBlocks;
  const [isExpanded, setIsExpanded] = useState(!shouldDefaultCollapse);

  // Auto-expand only when this specific tool's input/output matches search
  useEffect(() => {
    if (!searchQuery) return;

    const query = searchQuery.toLowerCase();
    const inputStr = toolUse?.tool_input ? JSON.stringify(toolUse.tool_input).toLowerCase() : '';
    const outputStr = toolResult?.tool_output
      ? JSON.stringify(toolResult.tool_output).toLowerCase()
      : '';
    const hasMatch = inputStr.includes(query) || outputStr.includes(query);

    if (hasMatch) {
      setIsExpanded(true);
    }
  }, [searchQuery, toolUse?.tool_input, toolResult?.tool_output]);

  // Use SubAgentCard for sub-agent calls
  if (toolType === 'subagent') {
    return (
      <SubAgentCard
        toolUse={toolUse}
        toolResult={toolResult}
        onViewSession={onViewSubAgentSession}
      />
    );
  }

  // Handle tool result without tool_use (may be due to turn matching issues)
  // Display normally but with a subtle indicator
  if (!toolUse && toolResult) {
    const summary = getToolSummary(toolName, undefined);

    return (
      <div className="border border-primary-border rounded-lg overflow-hidden bg-primary-muted">
        {/* Tool Header - Clickable to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-primary-light border-b border-primary-border text-left cursor-pointer hover:bg-primary-muted transition-colors"
        >
          {getToolIcon(toolType)}
          <span className="font-medium text-sm">{getToolDisplayName(toolName)}</span>
          {toolResult?.model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title="AI Model"
            >
              {toolResult.model}
            </span>
          )}
          {summary && (
            <span
              className="text-xs text-muted-foreground ml-auto truncate flex-1 text-right mr-2"
              title={summary}
            >
              {summary}
            </span>
          )}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <span
            className="text-[10px] text-amber-500/70 flex-shrink-0"
            title={t('sessions.inputNotAvailable', 'Input not available')}
          >
            ※
          </span>
        </button>

        {/* Tool Output */}
        {isExpanded && toolResult?.tool_output && (
          <div className="px-3 py-2">
            <div className="text-xs text-muted-foreground mb-1">Output</div>
            <ToolOutputDisplay output={toolResult.tool_output} searchQuery={searchQuery} />
          </div>
        )}
      </div>
    );
  }

  const summary = getToolSummary(toolName, toolUse?.tool_input);

  return (
    <div className="border border-primary-border rounded-lg overflow-hidden bg-primary-muted">
      {/* Thinking / Reasoning Block */}
      {reasoningContent && showThinkingContent && (
        <div className="border-b border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
          <button
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Thinking</span>
            <span className="text-xs text-amber-600/70 dark:text-amber-500/70 ml-auto">
              {isReasoningExpanded ? '收起' : '展开'}
            </span>
            {isReasoningExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
            )}
          </button>
          {isReasoningExpanded && (
            <div className="px-3 pb-3 text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed border-t border-amber-200/30 dark:border-amber-800/30 pt-2">
              {searchQuery ? (
                <HighlightedText text={reasoningContent} query={searchQuery} />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {reasoningContent}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tool Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-primary-light border-b border-primary-border text-left cursor-pointer hover:bg-primary-muted transition-colors"
      >
        {getToolIcon(toolType)}
        <span className="font-medium text-sm">{getToolDisplayName(toolName)}</span>
        {(toolUse?.model || toolResult?.model) && (
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
            title="AI Model"
          >
            {toolUse?.model || toolResult?.model}
          </span>
        )}
        {summary && (
          <span
            className="text-xs text-muted-foreground ml-auto truncate flex-1 text-right mr-2"
            title={summary}
          >
            {summary}
          </span>
        )}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Tool Input */}
      {isExpanded && toolUse?.tool_input && (
        <div className="px-3 py-2 border-b border-dashed">
          <div className="text-xs text-muted-foreground mb-1">Input</div>
          <ToolInputDisplay input={toolUse.tool_input} searchQuery={searchQuery} toolName={toolName} />
        </div>
      )}

      {/* Tool Output */}
      {isExpanded && toolResult?.tool_output && (
        <div className="px-3 py-2">
          <div className="text-xs text-muted-foreground mb-1">Output</div>
          <ToolOutputDisplay
            output={toolResult.tool_output}
            searchQuery={searchQuery}
            toolName={toolName}
          />
        </div>
      )}
    </div>
  );
}

type ToolType = 'mcp' | 'filesystem' | 'search' | 'code' | 'subagent' | 'plan' | 'generic';

function getToolType(toolName: string): ToolType {
  const name = toolName.toLowerCase();

  // MCP tools (from skills)
  if (name.includes('skill') || name.includes('mcp')) {
    return 'mcp';
  }

  // Sub-agent calls
  if (name.includes('agent') || name.includes('spawn') || name.includes('delegate')) {
    return 'subagent';
  }

  // Plan mode operations
  if (name.includes('planmode') || name === 'enterplanmode' || name === 'exitplanmode') {
    return 'plan';
  }

  // Filesystem operations
  if (['read', 'write', 'glob', 'grep', 'edit', 'ls', 'mkdir'].includes(name)) {
    return 'filesystem';
  }

  // Search operations
  if (['search', 'fetch', 'curl'].includes(name)) {
    return 'search';
  }

  // Code operations
  if (['bash', 'python', 'node', 'npm'].includes(name)) {
    return 'code';
  }

  return 'generic';
}

function getToolIcon(toolType: ToolType) {
  const className = 'h-4 w-4';

  switch (toolType) {
    case 'mcp':
      return <Puzzle className={cn(className, 'text-blue-500')} />;
    case 'filesystem':
      return <Terminal className={cn(className, 'text-green-500')} />;
    case 'search':
      return <Wrench className={cn(className, 'text-yellow-500')} />;
    case 'code':
      return <Terminal className={cn(className, 'text-orange-500')} />;
    case 'subagent':
      return <Bot className={cn(className, 'text-purple-500')} />;
    case 'plan':
      return <ListTodo className={cn(className, 'text-indigo-500')} />;
    default:
      return <Wrench className={cn(className, 'text-gray-500')} />;
  }
}

function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    read: 'Read File',
    write: 'Write File',
    edit: 'Edit File',
    glob: 'Find Files',
    grep: 'Search Content',
    ls: 'List Directory',
    mkdir: 'Create Directory',
    bash: 'Execute Command',
    skill: 'MCP Skill',
    EnterPlanMode: 'Enter Plan Mode',
    ExitPlanMode: 'Exit Plan Mode',
  };

  return displayNames[toolName] || toolName.charAt(0).toUpperCase() + toolName.slice(1);
}

/**
 * Get a summary of the tool input for display in the header
 * E.g., file path for read/write, command for bash, pattern for grep
 */
function getToolSummary(toolName: string, input?: Record<string, unknown>): string | null {
  if (!input) return null;

  const name = toolName.toLowerCase();

  // File operations - show file path
  if (['read', 'write', 'edit'].includes(name)) {
    const filePath = input.file_path || input.path;
    if (typeof filePath === 'string') {
      // Extract just the filename from the path
      const parts = filePath.split('/');
      return parts[parts.length - 1] || filePath;
    }
  }

  // Glob - show pattern
  if (name === 'glob') {
    const pattern = input.pattern || input.glob;
    if (typeof pattern === 'string') {
      return pattern;
    }
  }

  // Grep - show pattern and path
  if (name === 'grep') {
    const pattern = input.pattern || input.regex;
    const path = input.path || input.file_path;
    if (typeof pattern === 'string') {
      const pathSuffix = typeof path === 'string' ? ` in ${path.split('/').pop()}` : '';
      return `"${pattern}"${pathSuffix}`;
    }
  }

  // Bash - show command preview
  if (name === 'bash') {
    const command = input.command;
    if (typeof command === 'string') {
      // Truncate long commands
      if (command.length > 50) {
        return command.substring(0, 50) + '...';
      }
      return command;
    }
  }

  // LS - show directory
  if (name === 'ls') {
    const dir = input.dir || input.directory || input.path;
    if (typeof dir === 'string') {
      const parts = dir.split('/');
      return parts[parts.length - 1] || dir;
    }
  }

  return null;
}

interface ToolInputDisplayProps {
  input?: Record<string, unknown>;
  searchQuery?: string;
  toolName?: string;
}

function ToolInputDisplay({ input, searchQuery = '', toolName = '' }: ToolInputDisplayProps) {
  if (!input || Object.keys(input).length === 0) {
    return <span className="text-xs text-muted-foreground">No input</span>;
  }

  // Special handling for Edit tool - show diff view
  if (toolName.toLowerCase() === 'edit') {
    return <EditFileInputDisplay input={input} searchQuery={searchQuery} />;
  }

  // Format specific inputs nicely
  const entries = Object.entries(input);

  return (
    <div className="text-xs space-y-1">
      {entries.map(([key, value]) => {
        const formattedValue = formatValue(value);
        return (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground font-mono flex-shrink-0">{key}:</span>
            <span className="font-mono break-all">
              {searchQuery ? (
                <HighlightedText text={formattedValue} query={searchQuery} />
              ) : (
                formattedValue
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface EditFileInputDisplayProps {
  input: Record<string, unknown>;
  searchQuery?: string;
}

// Compute diff using the 'diff' library for better accuracy
type DiffLine = { type: 'unchanged' | 'removed' | 'added'; oldLine?: string; newLine?: string; oldIndex?: number; newIndex?: number };

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const oldContent = oldLines.join('\n');
  const newContent = newLines.join('\n');
  
  // Use diffLines with ignoreWhitespace option
  const changes = Diff.diffLines(oldContent, newContent, { 
    ignoreWhitespace: true,
    newlineIsToken: false 
  });
  
  const result: DiffLine[] = [];
  let oldIdx = 0;
  let newIdx = 0;
  
  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n');
    // Handle trailing newline
    if (change.value.endsWith('\n') && lines[lines.length - 1] === '') {
      lines.pop();
    }
    
    if (change.added) {
      // New lines added
      for (const line of lines) {
        result.push({ type: 'added', newLine: line, newIndex: newIdx });
        newIdx++;
      }
    } else if (change.removed) {
      // Old lines removed
      for (const line of lines) {
        result.push({ type: 'removed', oldLine: line, oldIndex: oldIdx });
        oldIdx++;
      }
    } else {
      // Unchanged lines
      for (const line of lines) {
        result.push({ type: 'unchanged', oldLine: line, newLine: line, oldIndex: oldIdx, newIndex: newIdx });
        oldIdx++;
        newIdx++;
      }
    }
  }
  
  return result;
}

function EditFileInputDisplay({ input }: EditFileInputDisplayProps) {
  const { t } = useTranslation();

  const filePath = String(input.file_path || input.path || '');
  // Support both snake_case and camelCase field names
  const oldString = String(input.old_string || input.oldString || '');
  const newString = String(input.new_string || input.newString || '');

  // Split content into lines for diff display (handle empty strings)
  const oldLines = oldString ? oldString.split('\n') : [];
  const newLines = newString ? newString.split('\n') : [];
  
  // Compute diff
  const diff = computeDiff(oldLines, newLines);

  // Handle singular/plural for line count
  const removedCount = diff.filter(d => d.type === 'removed').length;
  const addedCount = diff.filter(d => d.type === 'added').length;
  
  const removedText = removedCount === 1
    ? `-1 ${t('sessions.line', 'line')}`
    : `-${removedCount} ${t('sessions.lines', 'lines')}`;
  const addedText = addedCount === 1
    ? `+1 ${t('sessions.line', 'line')}`
    : `+${addedCount} ${t('sessions.lines', 'lines')}`;

  return (
    <div className="space-y-3">
      {/* File Path */}
      {filePath && (
        <div className="flex gap-2 text-xs">
          <span className="text-muted-foreground font-mono flex-shrink-0">file:</span>
          <span className="font-mono text-primary">{filePath}</span>
        </div>
      )}

      {/* Diff View */}
      <div className="rounded-lg overflow-hidden border border-primary-border">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-primary-muted border-b border-primary-border">
          <span className="text-xs font-medium text-muted-foreground">{t('sessions.changes', 'Changes')}</span>
          <div className="flex items-center gap-3 text-[10px]">
            {removedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-mono text-red-500">{removedText}</span>
              </span>
            )}
            {addedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-mono text-green-500">{addedText}</span>
              </span>
            )}
          </div>
        </div>

        {/* Unified Diff Content */}
        {diff.length > 0 && (
          <div className="max-h-[400px] overflow-auto">
            <div className="text-xs font-mono">
              {diff.map((item, index) => {
                if (item.type === 'unchanged') {
                  return (
                    <div key={index} className="flex hover:bg-primary-muted">
                      <span className="w-12 flex-shrink-0 text-right pr-2 py-0.5 text-[10px] text-primary/40 select-none border-r border-primary-border/30">
                        {(item.oldIndex ?? 0) + 1}
                      </span>
                      <span className="w-6 flex-shrink-0 text-center py-0.5 text-muted-foreground/30">
                        {' '}
                      </span>
                      <pre className="flex-1 px-2 py-0.5 text-muted-foreground/60 whitespace-pre-wrap break-all">
                        {item.oldLine || ' '}
                      </pre>
                    </div>
                  );
                } else if (item.type === 'removed') {
                  return (
                    <div key={index} className="flex bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10">
                      <span className="w-12 flex-shrink-0 text-right pr-2 py-0.5 text-[10px] text-red-400/60 select-none border-r border-red-200/30 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/20">
                        {(item.oldIndex ?? 0) + 1}
                      </span>
                      <span className="w-6 flex-shrink-0 text-center py-0.5 text-red-500 font-bold">
                        -
                      </span>
                      <pre className="flex-1 px-2 py-0.5 text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                        {item.oldLine || ' '}
                      </pre>
                    </div>
                  );
                } else {
                  return (
                    <div key={index} className="flex bg-green-500/5 dark:bg-green-500/10 hover:bg-green-500/10">
                      <span className="w-12 flex-shrink-0 text-right pr-2 py-0.5 text-[10px] text-green-400/60 select-none border-r border-green-200/30 dark:border-green-800/30 bg-green-50/30 dark:bg-green-950/20">
                        {(item.newIndex ?? 0) + 1}
                      </span>
                      <span className="w-6 flex-shrink-0 text-center py-0.5 text-green-500 font-bold">
                        +
                      </span>
                      <pre className="flex-1 px-2 py-0.5 text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">
                        {item.newLine || ' '}
                      </pre>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const MAX_TOOL_OUTPUT_LINES = 20; // 工具输出超过此行数默认折叠

interface ToolOutputDisplayProps {
  output: SessionMessage['tool_output'];
  searchQuery?: string;
  toolName?: string;
}

function ToolOutputDisplay({ output, searchQuery = '', toolName = '' }: ToolOutputDisplayProps) {
  const { collapseBashBlocks } = useExperienceStore();
  const isBashTool = toolName.toLowerCase() === 'bash';
  // For bash tools, use the setting to determine default expanded state
  // For other tools, default to expanded (not collapsed)
  const shouldDefaultCollapse = isBashTool && collapseBashBlocks;
  const [isExpanded, setIsExpanded] = useState(!shouldDefaultCollapse);

  if (!output) {
    return <span className="text-xs text-muted-foreground">No output</span>;
  }

  // Extract text content
  let text = '';
  if (typeof output.output === 'string') {
    text = output.output;
  } else if (output.content && Array.isArray(output.content)) {
    text = output.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
  }

  // If no text, show JSON
  if (!text) {
    const jsonStr = JSON.stringify(output, null, 2);
    return (
      <pre className="text-xs font-mono bg-primary-muted rounded p-2 whitespace-pre-wrap break-all">
        {searchQuery ? <HighlightedText text={jsonStr} query={searchQuery} /> : jsonStr}
      </pre>
    );
  }

  // Calculate lines
  const lines = text.split('\n');
  const totalLines = lines.length;
  const shouldCollapse = totalLines > MAX_TOOL_OUTPUT_LINES;
  const displayText =
    shouldCollapse && !isExpanded
      ? lines.slice(0, MAX_TOOL_OUTPUT_LINES).join('\n') + '\n\n...'
      : text;

  return (
    <div className="relative">
      <pre className="text-xs font-mono bg-primary-muted rounded p-2 whitespace-pre-wrap break-all">
        {searchQuery ? <HighlightedText text={displayText} query={searchQuery} /> : displayText}
      </pre>
      {shouldCollapse && !searchQuery && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-primary hover:text-primary-hover transition-colors border border-primary-border/50 rounded-full bg-primary-muted hover:bg-primary-light"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                收起
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                展开全部 ({totalLines} 行)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
