/**
 * Search Bar Component
 *
 * Search input for filtering session messages
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
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange]);

  const hasPartialLoad = loadedMessages < totalMessages;
  const showLoadAll = hasPartialLoad && query.length > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 border-b bg-card/50',
        'transition-colors duration-200',
        isFocused && 'bg-card',
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t('search.placeholder')}
          className={cn(
            'pl-9 pr-8',
            'bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            'placeholder:text-muted-foreground/60'
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-muted transition-colors"
            title={t('search.clear')}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Match count */}
      {query && (
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {matchCount > 0 ? (
            <span className="text-foreground font-medium">{matchCount}</span>
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
          className="whitespace-nowrap text-xs"
        >
          {isLoadingAll ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              {t('search.loadingAll')}
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{t('search.loadAll')}</span>
              <span className="sm:hidden">{t('search.loadAll')}</span>
            </>
          )}
        </Button>
      )}

      {/* Partial load indicator */}
      {hasPartialLoad && !query && (
        <div className="text-xs text-muted-foreground/70 whitespace-nowrap hidden sm:block">
          {loadedMessages}/{totalMessages}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
