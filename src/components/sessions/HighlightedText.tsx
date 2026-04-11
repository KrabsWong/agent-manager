/**
 * Highlighted Text Component
 *
 * Renders text with search matches highlighted
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightedText = memo(function HighlightedText({
  text,
  query,
  className,
}: HighlightedTextProps) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const parts: Array<{ text: string; isMatch: boolean }> = [];

  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, index),
        isMatch: false,
      });
    }

    // Add match
    parts.push({
      text: text.slice(index, index + query.length),
      isMatch: true,
    });

    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isMatch: false,
    });
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.isMatch ? (
          <mark
            key={i}
            className={cn(
              'bg-yellow-200 dark:bg-yellow-700/60',
              'text-inherit font-medium',
              'px-0.5 rounded-sm'
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
});

export default HighlightedText;
