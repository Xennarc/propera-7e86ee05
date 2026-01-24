// In-memory error capture for debug panel display

interface CapturedError {
  timestamp: Date;
  message: string;
  stack?: string;
  type: 'error' | 'unhandled' | 'network';
}

const MAX_ERRORS = 10;
let errors: CapturedError[] = [];
let isInitialized = false;

export function captureError(error: Error | string, type: CapturedError['type'] = 'error'): void {
  const captured: CapturedError = {
    timestamp: new Date(),
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    type,
  };
  
  errors = [captured, ...errors].slice(0, MAX_ERRORS);
}

export function getErrors(): CapturedError[] {
  return errors;
}

export function clearErrors(): void {
  errors = [];
}

export function initErrorCapture(): () => void {
  if (isInitialized) return () => {};
  
  isInitialized = true;
  
  // Capture window errors
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    captureError(error || String(message), 'unhandled');
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Capture unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    const message = event.reason?.message || String(event.reason);
    captureError(message, 'unhandled');
  };
  window.addEventListener('unhandledrejection', handleRejection);

  // Capture console.error calls
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    captureError(message, 'error');
    originalConsoleError.apply(console, args);
  };

  // Return cleanup function
  return () => {
    window.onerror = originalOnError;
    window.removeEventListener('unhandledrejection', handleRejection);
    console.error = originalConsoleError;
    isInitialized = false;
  };
}
