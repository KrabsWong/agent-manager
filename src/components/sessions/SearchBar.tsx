/**
 * Search Bar Component
 *
 * Collapsible search input for filtering session messages
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  matchCount: number;
  totalMessages: number;
  loadedMessages: number;
  onLoadAll?: () => void;
  isLoadingAll?: boolean;
  className?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  matchCount,
  totalMessages,
  loadedMessages,
  onLoadAll,
  isLoadingAll,
  className,
}: SearchBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-expand when query is entered from outside
  useEffect(() => {
    if (query && !isExpanded) {
      setIsExpanded(true);
    }
  }, [query, isExpanded]);

  const handleClear = useCallback(() => {
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange]);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    onQueryChange('');
  }, [onQueryChange]);

  const hasPartialLoad = loadedMessages < totalMessages;
  const showLoadAll = hasPartialLoad && query.length > 0;

  // Collapsed state - just show search button
  if (!isExpanded) {
    return (
      <div className={cn('flex justify-end p-2', className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="h-8 w-8 p-0"
          title={t('search.placeholder')}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  // Expanded state - show search input
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 border-b bg-card/50',
        'transition-all duration-200',
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('search.placeholder')}
          className={cn(
            'pl-8 pr-16 h-8 text-sm',
            'bg-background border focus-visible:ring-1 focus-visible:ring-primary',
            'placeholder:text-muted-foreground/60'
          )}
          autoFocus
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-muted transition-colors"
            title={t('search.clear')}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Match count */}
      {query && (
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {matchCount > 0 ? (
            <span className="text-foreground font-medium">{matchCount} 条</span>
          ) : (
            <span className="text-muted-foreground">{t('search.noMatches')}</span>
          )}
        </div>
      )}

      {/* Load all button */}
      {showLoadAll && (
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadAll}
          disabled={isLoadingAll}
          className="h-7 px-2 text-xs whitespace-nowrap"
        >
          {isLoadingAll ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              <span className="hidden sm:inline">{t('search.loadingAll')}</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{t('search.loadAll')}</span>
              <span className="sm:hidden">...</span>
            </>
          )}
        </Button>
      )}

      {/* Close button */}
      <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0">
        <X className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export default SearchBar;
