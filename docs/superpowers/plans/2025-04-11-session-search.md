# Session Search Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time search functionality to individual sessions, allowing users to filter and highlight messages within a conversation.

**Architecture:** The search feature is implemented as client-side filtering within ConversationView. A SearchBar component provides the UI, HighlightedText component handles text highlighting, and ConversationView manages the search state and filtered results.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui components, i18next for translations

---

## File Structure

### New Files

- `src/components/sessions/SearchBar.tsx` - Search input component with match count
- `src/components/sessions/HighlightedText.tsx` - Text highlighting component

### Modified Files

- `src/components/sessions/ConversationView.tsx` - Add search state and filtering logic
- `src/lib/i18n/index.ts` - Add translation keys for search UI

---

## Implementation Tasks

### Task 1: Add Translation Keys

**Files:**

- Modify: `src/lib/i18n/index.ts`

Add search-related translation keys to both `enTranslations` and `zhTranslations` objects.

- [ ] **Step 1: Add English translations**

Find the `const enTranslations = { ... }` object and add a `search` section:

```typescript
const enTranslations = {
  // ... existing translations ...
  search: {
    placeholder: 'Search in conversation...',
    noMatches: 'No matches found',
    matchesCount: '{{count}} matches',
    loadAll: 'Load all messages to search',
    loadingAll: 'Loading all messages...',
    clear: 'Clear search',
    shortcut: 'Press {{key}} to search',
  },
  // ... rest of translations ...
};
```

- [ ] **Step 2: Add Chinese translations**

Find the `const zhTranslations = { ... }` object and add the corresponding `search` section:

```typescript
const zhTranslations = {
  // ... existing translations ...
  search: {
    placeholder: '在对话中搜索...',
    noMatches: '未找到匹配内容',
    matchesCount: '{{count}} 个匹配',
    loadAll: '加载全部消息以搜索',
    loadingAll: '正在加载全部消息...',
    clear: '清除搜索',
    shortcut: '按 {{key}} 开始搜索',
  },
  // ... rest of translations ...
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/index.ts
git commit -m "feat(search): add translation keys for session search"
```

---

### Task 2: Create HighlightedText Component

**Files:**

- Create: `src/components/sessions/HighlightedText.tsx`

This component renders text with highlighted search matches.

- [ ] **Step 1: Create the component file**

Create `src/components/sessions/HighlightedText.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sessions/HighlightedText.tsx
git commit -m "feat(search): create HighlightedText component"
```

---

### Task 3: Create SearchBar Component

**Files:**

- Create: `src/components/sessions/SearchBar.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/sessions/SearchBar.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sessions/SearchBar.tsx
git commit -m "feat(search): create SearchBar component with keyboard shortcut"
```

---

### Task 4: Add Search to ConversationView

**Files:**

- Modify: `src/components/sessions/ConversationView.tsx`

Add search state management and filtering logic to the ConversationView component.

- [ ] **Step 1: Add search state and imports**

At the top of `ConversationView.tsx`, add imports:

```typescript
import { useState, useMemo, memo, useRef, useEffect, useCallback } from 'react';
// ... existing imports ...
import { SearchBar } from './SearchBar';
import { HighlightedText } from './HighlightedText';
```

- [ ] **Step 2: Add search state to ConversationView**

Inside the `ConversationView` function, add:

```typescript
export function ConversationView({
  messages,
  className,
  appType = 'claude',
  onLoadAll,
  onViewSubAgentSession,
}: ConversationViewProps) {
  // ... existing code ...

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ... rest of existing code ...
}
```

- [ ] **Step 3: Add search filtering logic**

Add a function to check if a message matches the search query. Add this before the return statement:

```typescript
// Check if a message matches the search query
const messageMatchesSearch = useCallback(
  (message: SessionMessage): boolean => {
    if (!debouncedQuery.trim()) return true;

    const query = debouncedQuery.toLowerCase();
    const searchableFields = [
      message.content,
      message.reasoning_content,
      message.tool_name,
      message.tool_input ? JSON.stringify(message.tool_input) : '',
      message.tool_output ? JSON.stringify(message.tool_output) : '',
    ];

    return searchableFields.some((field) => field && field.toLowerCase().includes(query));
  },
  [debouncedQuery]
);

// Filter turns based on search
const filteredTurns = useMemo(() => {
  if (!debouncedQuery.trim()) {
    return displayedTurns;
  }

  return displayedTurns.filter((turn) => {
    // Check user message
    if (
      turn.userMessage?.content &&
      turn.userMessage.content.toLowerCase().includes(debouncedQuery.toLowerCase())
    ) {
      return true;
    }

    // Check assistant message
    if (
      turn.assistantMessage?.content &&
      turn.assistantMessage.content.toLowerCase().includes(debouncedQuery.toLowerCase())
    ) {
      return true;
    }

    if (
      turn.assistantMessage?.reasoning_content &&
      turn.assistantMessage.reasoning_content.toLowerCase().includes(debouncedQuery.toLowerCase())
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

      if (toolContent.toLowerCase().includes(debouncedQuery.toLowerCase())) {
        return true;
      }
    }

    // Check system messages
    for (const sysMsg of turn.systemMessages) {
      if (sysMsg.content?.toLowerCase().includes(debouncedQuery.toLowerCase())) {
        return true;
      }
    }

    return false;
  });
}, [displayedTurns, debouncedQuery]);

// Calculate match count for display
const matchCount = useMemo(() => {
  if (!debouncedQuery.trim()) return 0;
  return filteredTurns.length;
}, [filteredTurns, debouncedQuery]);

// Handle load all
const handleLoadAll = useCallback(async () => {
  setIsLoadingAll(true);
  handleLoadAll?.();
  // Wait a bit for the load to complete
  setTimeout(() => setIsLoadingAll(false), 500);
}, [handleLoadAll]);
```

- [ ] **Step 4: Update the return statement to include SearchBar**

Find the return statement in `ConversationView` and add the SearchBar. The return should look like:

```typescript
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Bar */}
      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        matchCount={matchCount}
        totalMessages={turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0)}
        loadedMessages={displayedTurns.reduce((sum, t) => sum + t.messageCount, 0)}
        onLoadAll={hasMore ? handleLoadAll : undefined}
        isLoadingAll={isLoadingAll}
      />

      {/* Messages Container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          id="conversation-scroll-container"
          className="h-full overflow-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent scroll-smooth"
          // ... rest of existing scroll container code ...
        >
          {/* Use filteredTurns instead of displayedTurns */}
          {filteredTurns.map((turn, index) => (
            <ConversationTurn
              key={index}
              turn={turn}
              appType={appType}
              onViewSubAgentSession={onViewSubAgentSession}
              searchQuery={debouncedQuery}
            />
          ))}
          {/* ... rest of existing content ... */}
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 5: Update ConversationTurn props and usage**

Update the `ConversationTurnProps` interface:

```typescript
interface ConversationTurnProps {
  turn: MessageTurn;
  appType: string;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
}
```

Update the `ConversationTurn` component to accept and pass searchQuery:

```typescript
const ConversationTurn = memo(function ConversationTurn({
  turn,
  appType,
  onViewSubAgentSession,
  searchQuery = '',
}: ConversationTurnProps) {
  // ... existing code ...

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

      {/* Tool Calls */}
      {turn.toolCalls.length > 0 && (
        <div className="space-y-2 ml-11">
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
      )}

      {/* Assistant Response */}
      {(turn.assistantMessage?.content || turn.assistantMessage?.reasoning_content) && (
        <AssistantMessage
          content={turn.assistantMessage.content || ''}
          reasoningContent={turn.assistantMessage.reasoning_content}
          timestamp={turn.assistantMessage.timestamp}
          appType={appType}
          model={turn.assistantMessage.model}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
});
```

- [ ] **Step 6: Update SystemMessage to support highlighting**

Update `SystemMessageProps` and `SystemMessage`:

```typescript
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
  // ... existing code ...

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-1.5">
        {config.icon}
        <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
        {model && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground" title="AI Model">
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
```

- [ ] **Step 7: Update UserMessage to support highlighting**

Update `UserMessageProps` and `UserMessage`:

```typescript
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
  // ... existing code ...

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">You</span>
          {model && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground" title="AI Model">
              {model}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="bg-primary/5 rounded-lg p-3 text-sm space-y-2">
          {parsedContents.map((item, index) => (
            <ParsedContentBlock key={index} item={item} searchQuery={searchQuery} />
          ))}
        </div>
      </div>
    </div>
  );
});
```

Update `ParsedContentBlock`:

```typescript
interface ParsedContentBlockProps {
  item: ParsedContent;
  searchQuery?: string;
}

function ParsedContentBlock({ item, searchQuery = '' }: ParsedContentBlockProps) {
  if (item.type === 'file') {
    return (
      <FileAttachment
        path={item.metadata?.path || ''}
        type={item.metadata?.type || ''}
        content={item.content}
        searchQuery={searchQuery}
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
```

- [ ] **Step 8: Commit**

```bash
git add src/components/sessions/ConversationView.tsx
git commit -m "feat(search): add search state and filtering to ConversationView"
```

---

### Task 5: Update AssistantMessage and ToolCallBlock

**Files:**

- Modify: `src/components/sessions/ConversationView.tsx`

Update remaining components to support highlighting.

- [ ] **Step 1: Update AssistantMessage**

```typescript
interface AssistantMessageProps {
  content: string;
  reasoningContent?: string;
  timestamp: string;
  appType?: string;
  model?: string;
  searchQuery?: string;
}

const AssistantMessage = memo(function AssistantMessage({
  content,
  reasoningContent,
  timestamp,
  appType = 'claude',
  model,
  searchQuery = '',
}: AssistantMessageProps) {
  // ... existing code ...

  // For the main content, use HighlightedText when there's a search query
  const renderContent = (text: string) => {
    if (searchQuery) {
      return <HighlightedText text={text} query={searchQuery} />;
    }
    return text;
  };

  // ... rest of component, update content rendering ...
});
```

- [ ] **Step 2: Update ToolCallBlock**

```typescript
interface ToolCallBlockProps {
  toolUse: SessionMessage | null;
  toolResult: SessionMessage | null;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
}

function ToolCallBlock({
  toolUse,
  toolResult,
  onViewSubAgentSession,
  searchQuery = '',
}: ToolCallBlockProps) {
  // ... existing code ...
  // Apply highlighting to tool input/output display
  // Use HighlightedText component for text content
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sessions/ConversationView.tsx
git commit -m "feat(search): add highlighting to AssistantMessage and ToolCallBlock"
```

---

## Verification Steps

After all tasks are complete, verify the implementation:

1. **Open a session** - Navigate to the Sessions page and open any conversation
2. **Test search** - Press Cmd/Ctrl+F or click in the search box
3. **Type a query** - Enter text that exists in the conversation
4. **Verify highlighting** - Matched text should be highlighted in yellow
5. **Verify filtering** - Non-matching messages should be hidden
6. **Test clear** - Click the X button to clear search
7. **Test partial load** - In a long conversation, search should show "Load all" button
8. **Test keyboard shortcut** - Press Cmd/Ctrl+F from anywhere in the app

---

## Notes

- The search is case-insensitive
- Search matches are highlighted in yellow
- The search operates on already-loaded messages only
- For partially loaded conversations, a "Load all" button is shown
- Keyboard shortcut Cmd/Ctrl+F focuses the search box
