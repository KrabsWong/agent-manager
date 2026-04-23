/**
 * Code Block Components
 *
 * 可折叠代码块和语法高亮
 */

import { useState, useRef, useEffect, memo } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { CSSProperties } from 'react';
import {
  MAX_CODE_LINES,
  CODE_LINES_INCREMENT,
  MAX_SYNTAX_HIGHLIGHT_LINES,
} from './types';

// Tokyo Night 主题配色
export const tokyoNightTheme: { [key: string]: CSSProperties } = {
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

interface CollapsibleCodeBlockProps {
  content: string;
  language: string;
}

export const CollapsibleCodeBlock = memo(function CollapsibleCodeBlock({
  content,
  language,
}: CollapsibleCodeBlockProps) {
  const [displayedLines, setDisplayedLines] = useState(MAX_CODE_LINES);
  const codeBlockRef = useRef<HTMLDivElement>(null);
  const prevDisplayedLinesRef = useRef(displayedLines);
  const lines = content.split('\n');
  const totalLines = lines.length;
  const shouldCollapse = totalLines > MAX_CODE_LINES;
  const isFullyExpanded = displayedLines >= totalLines;
  const shouldHighlight = totalLines <= MAX_SYNTAX_HIGHLIGHT_LINES;

  const currentDisplayLines = shouldCollapse ? Math.min(displayedLines, totalLines) : totalLines;
  const displayContent = lines.slice(0, currentDisplayLines).join('\n').replace(/\n$/, '');

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
    if (codeBlockRef.current) {
      codeBlockRef.current.scrollTop = 0;
    }
  };

  const useIncrementalLoad = shouldHighlight;

  const handleExpand = () => {
    if (useIncrementalLoad) {
      setDisplayedLines((prev) => Math.min(prev + CODE_LINES_INCREMENT, totalLines));
    } else {
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
      <div
        ref={codeBlockRef}
        className="overflow-auto max-h-[600px] rounded-md border border-primary-border"
      >
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
});

export default CollapsibleCodeBlock;
