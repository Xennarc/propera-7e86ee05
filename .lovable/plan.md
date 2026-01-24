

# Fix GuestDetailPage Crash + Improve Error Capture

## Problem Analysis

The `GuestDetailPage` crashes for **some guests** due to remaining unsafe `date-fns` calls that bypass the safe wrappers. Additionally, the debug console shows `{}` instead of actual error messages because `JSON.stringify()` doesn't capture non-enumerable `Error` properties.

---

## Root Causes

### Issue 1: Unsafe Date Parsing (Crash Source)

| File | Line | Unsafe Code |
|------|------|-------------|
| `PrearrivalProfileCard.tsx` | 205 | `format(parseISO(checkInDate), 'MMM d')` |
| `GuestPrearrivalQuickFlags.tsx` | 144 | `formatDistanceToNow(parseISO(status.lastUpdatedAt), ...)` |
| `SharePrearrivalLinkDialog.tsx` | 46 | `format(parseISO(guest.check_in_date), 'MMMM d, yyyy')` |

These cause the ErrorBoundary crash when a guest has malformed or null date data.

### Issue 2: Empty Error Messages in Debug Console

In `debug-error-capture.ts:58-60`:
```typescript
const message = args.map(arg => 
  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
).join(' ');
```

`JSON.stringify(error)` returns `{}` for native `Error` objects because `message` and `stack` are non-enumerable.

---

## Solution

### Part 1: Fix Remaining Unsafe Date Parsing

**File: `src/components/prearrival/PrearrivalProfileCard.tsx`**

Line 205 - Replace:
```typescript
lines.push(`Arriving: ${format(parseISO(checkInDate), 'MMM d')}, ${timeStr}${flightStr}`);
```
With:
```typescript
lines.push(`Arriving: ${safeFormatDate(checkInDate, 'MMM d')}, ${timeStr}${flightStr}`);
```

Also update imports to remove unused `format`/`parseISO` from `date-fns` and ensure `safeFormatDate` is imported.

---

**File: `src/components/guests/GuestPrearrivalQuickFlags.tsx`**

Line 144 - Replace:
```typescript
<span>{formatDistanceToNow(parseISO(status.lastUpdatedAt), { addSuffix: true })}</span>
```
With:
```typescript
<span>{safeFormatDistanceToNow(status.lastUpdatedAt, { addSuffix: true })}</span>
```

Update imports accordingly.

---

**File: `src/components/prearrival/SharePrearrivalLinkDialog.tsx`**

Line 46 - Replace:
```typescript
const checkInFormatted = format(parseISO(guest.check_in_date), 'MMMM d, yyyy');
```
With:
```typescript
const checkInFormatted = safeFormatDate(guest.check_in_date, 'MMMM d, yyyy') || 'your arrival date';
```

Update imports accordingly.

---

### Part 2: Fix Debug Console Error Serialization

**File: `src/lib/debug-error-capture.ts`**

Update the console.error interceptor to properly handle Error objects:

```typescript
// Capture console.error calls
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.map(arg => {
    // Handle Error objects specially - they don't serialize with JSON.stringify
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  // Also capture stack trace from any Error in args
  const errorArg = args.find(arg => arg instanceof Error);
  const stack = errorArg?.stack;
  
  captureError(message, 'error', stack);
  originalConsoleError.apply(console, args);
};
```

Also update the `captureError` function signature to accept an optional stack parameter:

```typescript
export function captureError(
  error: Error | string, 
  type: CapturedError['type'] = 'error',
  explicitStack?: string
): void {
  const captured: CapturedError = {
    timestamp: new Date(),
    message: typeof error === 'string' ? error : error.message,
    stack: explicitStack || (typeof error === 'object' ? error.stack : undefined),
    type,
  };
  
  errors = [captured, ...errors].slice(0, MAX_ERRORS);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/prearrival/PrearrivalProfileCard.tsx` | Use `safeFormatDate` at line 205 |
| `src/components/guests/GuestPrearrivalQuickFlags.tsx` | Use `safeFormatDistanceToNow` at line 144 |
| `src/components/prearrival/SharePrearrivalLinkDialog.tsx` | Use `safeFormatDate` at line 46 |
| `src/lib/debug-error-capture.ts` | Fix Error serialization in console.error interceptor |

---

## Impact

- **Crash prevention**: No more ErrorBoundary crashes from malformed guest dates
- **Graceful fallbacks**: Invalid dates show "Invalid date" or contextual fallback text
- **Better debugging**: Error messages in debug panel will show actual error text instead of `{}`

---

## Testing

After implementation:
1. Navigate to GuestDetailPage for guests that were previously crashing
2. Verify the page loads without errors
3. Trigger an intentional error and check the debug panel shows the full message
4. Verify date formatting still works correctly for valid data

