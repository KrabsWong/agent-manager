# Session Search Feature Design

**Date:** 2025-04-11
**Feature:** Single Session Search
**Status:** Approved

## Overview

Add search functionality to individual sessions, allowing users to find specific content within a conversation. This addresses the need to quickly locate information in long AI conversations.

## Goals

1. Allow users to search within the currently opened session
2. Filter messages in real-time based on search query
3. Highlight matching text in search results
4. Handle partial loading gracefully (show warning when not all messages are loaded)

## Non-Goals

1. Cross-session search (searching across multiple sessions)
2. Full-text search with indexing
3. Advanced search syntax (regex, boolean operators)
4. Search history or saved searches

## Architecture

The search feature will be implemented as a client-side filter within the `ConversationView` component. It operates on the already-loaded messages, filtering and highlighting matches in real-time.

### Data Flow

```
User types in search box
    ↓
Search query state updates
    ↓
Messages are filtered by search query
    ↓
Filtered messages are displayed with highlighted matches
```

### Components

1. **SearchBar** - New component for the search input
   - Text input with clear button
   - Match count display
   - Load all messages button (when partial)

2. **ConversationView** - Modified existing component
   - Add search state management
   - Filter messages based on search query
   - Pass search context to child components

3. **HighlightedText** - New component for text highlighting
   - Renders text with matched portions highlighted
   - Used by UserMessage, AssistantMessage, ToolCallBlock

## UI/UX Design

### Search Bar Placement

- Position: Top of the conversation view, below the session header
- Fixed position while scrolling
- Collapsible (can be hidden when not needed)

### Search Bar Features

- Placeholder text: "Search in conversation..."
- Clear button (X) when text is entered
- Match count: "3/12 matches"
- Keyboard shortcut: Cmd/Ctrl + F to focus
- Load all messages button when partially loaded

### Message Highlighting

- Yellow background for matched text
- Smooth scroll to first match
- Matched messages remain visible, non-matched are hidden

## Technical Details

### Search Algorithm

```typescript
function searchMessages(messages: SessionMessage[], query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return messages.filter((message) => {
    const searchableContent = [
      message.content,
      message.reasoning_content,
      message.tool_name,
      JSON.stringify(message.tool_input),
      JSON.stringify(message.tool_output),
    ]
      .join(' ')
      .toLowerCase();

    return searchableContent.includes(lowerQuery);
  });
}
```

### Performance Considerations

1. **Debouncing**: Debounce search input by 150ms to avoid excessive re-renders
2. **Memoization**: Use `useMemo` for filtered results
3. **Virtual scrolling**: Continue using virtual scrolling for large result sets
4. **Partial loading**: Show warning when not all messages are loaded

### State Management

```typescript
interface SearchState {
  query: string;
  isActive: boolean;
  matchCount: number;
}
```

### Error Handling

1. Empty search query → Show all messages
2. No matches → Show "No matches found" message
3. Partial load → Show warning with "Load all" button

## Files to Modify

1. `src/components/sessions/ConversationView.tsx` - Add search state and filtering logic
2. `src/components/sessions/SearchBar.tsx` - New search input component
3. `src/components/sessions/HighlightedText.tsx` - New text highlighting component
4. `src/lib/i18n/index.ts` - Add translation keys for search UI

## Testing Strategy

1. **Unit tests**: Search filtering logic
2. **Integration tests**: Search bar interaction
3. **Manual testing**:
   - Search in sessions with 1000+ messages
   - Search with special characters
   - Search in tool calls and outputs
   - Keyboard shortcut testing

## Future Enhancements

1. Case-sensitive search option
2. Regex search mode
3. Search within specific message types (user only, assistant only, tools)
4. Navigate between matches with up/down arrows
5. Persist search query when switching sessions

## Open Questions

None - design approved by user.
