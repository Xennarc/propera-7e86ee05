
# Update Debug Console to Show Full Error Messages

## Current State

The Staff Debug Panel displays errors with the following limitations:
- Error messages are truncated to 2 lines via `line-clamp-2` CSS class
- Stack traces are captured but **not displayed**
- Only the first 5 errors are shown (others are captured but hidden)
- No way to expand an individual error for more detail

## Proposed Changes

### 1. Add Expandable Error Details

Replace the current static error display with an expandable view that shows:
- **Collapsed view**: Type badge, timestamp, and first line of error (current behavior)
- **Expanded view**: Full error message + stack trace (if available)

### 2. Implementation Details

**File: `src/components/staff/StaffDebugPanel.tsx`**

Create a new `ErrorRow` component with expand/collapse functionality:

```typescript
function ErrorRow({ error, index }: { error: CapturedError; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="py-1.5 border-b border-border/30 last:border-0">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
          <Badge>{error.type}</Badge>
          <span className="text-muted-foreground">{timestamp}</span>
        </div>
        {!isExpanded && (
          <p className="text-[11px] font-mono mt-1 line-clamp-1">
            {error.message}
          </p>
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {/* Full message in scrollable container */}
          <div className="bg-muted/50 rounded p-2 max-h-32 overflow-auto">
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </div>
          {/* Stack trace if available */}
          {error.stack && (
            <div className="bg-red-500/10 rounded p-2 max-h-40 overflow-auto">
              <pre className="text-[9px] font-mono whitespace-pre-wrap text-red-400">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3. Additional Improvements

| Feature | Change |
|---------|--------|
| Show more errors | Increase from 5 to 10 visible errors |
| Copy error button | Add clipboard copy for full error + stack |
| Visual hierarchy | Indent stack trace, use darker background for context |

### 4. Type Import

The `CapturedError` interface needs to be exported from `debug-error-capture.ts` and imported into `StaffDebugPanel.tsx` so the `ErrorRow` component can be properly typed.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/debug-error-capture.ts` | Export the `CapturedError` interface |
| `src/components/staff/StaffDebugPanel.tsx` | Add `ErrorRow` component with expand/collapse, show stack traces, increase visible error count, add copy button |

---

## Visual Mockup

```text
┌─────────────────────────────────────────┐
│ ▶ [error]  10:45:32 AM                  │  ← Collapsed
│   Cannot read property 'id' of undef... │
├─────────────────────────────────────────┤
│ ▼ [unhandled]  10:44:18 AM         [📋] │  ← Expanded
│ ┌─────────────────────────────────────┐ │
│ │ Cannot read property 'id' of       │ │
│ │ undefined. This occurred when      │ │
│ │ trying to access guest.id in the   │ │
│ │ booking confirmation flow.         │ │
│ └─────────────────────────────────────┘ │
│ Stack Trace:                            │
│ ┌─────────────────────────────────────┐ │
│ │ at GuestBookingPage (GuestBook...  │ │
│ │ at renderWithHooks (react-dom...   │ │
│ │ at updateFunctionComponent (...    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Benefits

1. **Full visibility**: Developers can see complete error messages without browser console
2. **Stack trace access**: Quickly identify error source locations
3. **Copy functionality**: Easy to share errors for debugging
4. **Preserved UX**: Collapsed by default keeps panel compact
