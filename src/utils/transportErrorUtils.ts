import { toast } from 'sonner';

interface TransportErrorContext {
  resortId?: string;
  requestIds?: string[];
  tripId?: string;
  buggyId?: string;
  driverUserId?: string;
}

interface TransportError {
  message: string;
  code?: string;
}

/**
 * Format error details for clipboard copy
 */
function formatErrorDetails(
  action: string,
  error: TransportError,
  context?: TransportErrorContext
): string {
  const lines = [
    `Action: ${action}`,
    `Error: ${error.message}`,
  ];
  
  if (error.code) {
    lines.push(`Code: ${error.code}`);
  }
  
  if (context) {
    if (context.resortId) lines.push(`Resort: ${context.resortId}`);
    if (context.tripId) lines.push(`Trip: ${context.tripId}`);
    if (context.buggyId) lines.push(`Buggy: ${context.buggyId}`);
    if (context.driverUserId) lines.push(`Driver: ${context.driverUserId}`);
    if (context.requestIds?.length) {
      lines.push(`Requests: ${context.requestIds.join(', ')}`);
    }
  }
  
  lines.push(`Time: ${new Date().toISOString()}`);
  
  return lines.join('\n');
}

/**
 * Copy error details to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse common RPC error messages into user-friendly text
 */
function parseErrorMessage(error: TransportError): string {
  const msg = error.message.toLowerCase();
  
  // Validation failures
  if (msg.includes('validation failed')) {
    const match = error.message.match(/Validation failed for (\d+) request\(s\)/);
    if (match) {
      return `${match[1]} request(s) could not be processed. They may be cancelled or already assigned.`;
    }
    return 'Some requests failed validation. Please refresh and try again.';
  }
  
  // Lock contention
  if (msg.includes('could not acquire lock') || msg.includes('deadlock')) {
    return 'Another operation is in progress. Please try again in a moment.';
  }
  
  // Not found
  if (msg.includes('not found')) {
    return 'The requested item was not found. It may have been modified. Please refresh.';
  }
  
  // Availability issues
  if (msg.includes('not available')) {
    return 'The selected buggy is no longer available. Please choose another.';
  }
  
  if (msg.includes('not online')) {
    return 'The selected driver is no longer online. Please choose another.';
  }
  
  // Trip state issues
  if (msg.includes('at least one attached request')) {
    return 'Trip must have at least one request before it can be assigned.';
  }
  
  if (msg.includes('trip is not in planning state')) {
    return 'This trip can no longer be modified. It may have been assigned or cancelled.';
  }
  
  // Enum errors (the specific bug we're fixing)
  if (msg.includes('invalid input value for enum')) {
    return 'Request status mismatch. Please refresh and try again.';
  }
  
  // Permission issues
  if (msg.includes('permission') || msg.includes('unauthorized')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  // Default: return original message (capitalized)
  return error.message.charAt(0).toUpperCase() + error.message.slice(1);
}

/**
 * Show a standardized transport error toast with action context and copy capability
 */
export function showTransportErrorToast(
  action: string,
  error: TransportError,
  context?: TransportErrorContext
): void {
  const friendlyMessage = parseErrorMessage(error);
  const errorDetails = formatErrorDetails(action, error, context);
  
  toast.error(`${action} failed`, {
    description: friendlyMessage,
    duration: 8000,
    action: {
      label: 'Copy details',
      onClick: async () => {
        const copied = await copyToClipboard(errorDetails);
        if (copied) {
          toast.success('Error details copied to clipboard');
        } else {
          toast.error('Failed to copy to clipboard');
        }
      },
    },
  });
}

/**
 * Show a standardized transport success toast
 */
export function showTransportSuccessToast(
  action: string,
  details?: string
): void {
  toast.success(action, {
    description: details,
    duration: 3000,
  });
}
