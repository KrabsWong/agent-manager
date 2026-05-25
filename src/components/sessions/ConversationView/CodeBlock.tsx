/**
 * Code Block Components
 *
 * 可折叠代码块和语法高亮
 */

import { memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';

const MAX_SYNTAX_HIGHLIGHT_LINES = 500;

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

interface CollapsibleCodeBlockProps {
  content: string;
  language: string;
}

export const CollapsibleCodeBlock = memo(function CollapsibleCodeBlock({
  content,
  language,
}: CollapsibleCodeBlockProps) {
  const { t } = useTranslation();
  const lines = content.split('\n');
  const totalLines = lines.length;
  const shouldHighlight = totalLines <= MAX_SYNTAX_HIGHLIGHT_LINES;
  const displayContent = content.replace(/\n$/, '');

  return (
    <div className="relative">
      {!shouldHighlight && (
        <div className="absolute top-0 right-0 z-10 px-2 py-1 text-[10px] text-primary bg-primary-muted rounded-bl border-l border-b border-primary-border">
          {t('sessions.syntaxHighlightDisabled')} ({totalLines} {t('sessions.lines')})
        </div>
      )}
      <div className="overflow-auto max-h-[600px] rounded-md border border-primary-border">
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
    </div>
  );
});
