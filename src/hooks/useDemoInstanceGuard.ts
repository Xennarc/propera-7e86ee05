// Compatibility shim — instance rotation guard is obsolete in the Perfect Demo
// model where each visitor owns a slot for the duration of their session.

interface DemoInstanceGuardResult {
  isStale: boolean;
  currentInstanceId: number | null;
  storedInstanceId: number | null;
  dismiss: () => void;
}

export function useDemoInstanceGuard(
  _resortId: string | undefined,
  _variant: 'guest' | 'staff',
): DemoInstanceGuardResult {
  return {
    isStale: false,
    currentInstanceId: null,
    storedInstanceId: null,
    dismiss: () => {},
  };
}

export function storeDemoInstanceId(_instanceId: number, _variant: 'guest' | 'staff') {
  /* no-op */
}

export function clearDemoInstanceState(_variant: 'guest' | 'staff') {
  /* no-op */
}
