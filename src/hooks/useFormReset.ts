import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to ensure forms are completely reset when dialogs open/close.
 * Provides a stable key that changes on each open to force React to remount form state.
 * 
 * Usage:
 * const { formKey, resetForm, isFirstRender } = useFormReset(open);
 * 
 * - formKey: Use as key prop on form container to force remount
 * - resetForm: Call to manually trigger reset
 * - isFirstRender: True until user interacts, used to suppress validation errors
 */
export function useFormReset(open: boolean) {
  const formKeyRef = useRef<string>(generateKey());
  const previousOpenRef = useRef<boolean>(false);
  const isFirstRenderRef = useRef<boolean>(true);

  // Generate new key when dialog opens (not when already open)
  useEffect(() => {
    if (open && !previousOpenRef.current) {
      // Dialog is opening - generate new key
      formKeyRef.current = generateKey();
      isFirstRenderRef.current = true;
    }
    previousOpenRef.current = open;
  }, [open]);

  const resetForm = useCallback(() => {
    formKeyRef.current = generateKey();
    isFirstRenderRef.current = true;
  }, []);

  const markInteracted = useCallback(() => {
    isFirstRenderRef.current = false;
  }, []);

  return {
    formKey: formKeyRef.current,
    resetForm,
    isFirstRender: isFirstRenderRef.current,
    markInteracted,
  };
}

function generateKey(): string {
  return `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default values factory for common form patterns.
 * Returns a function that creates fresh default values each time.
 */
export function createDefaultValues<T extends Record<string, unknown>>(defaults: T): () => T {
  return () => ({ ...defaults });
}
