import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useKeyboardInset - Detects on-screen keyboard height using visualViewport API
 * 
 * Returns the keyboard inset in pixels, which can be used to pad content
 * so that form fields remain visible when the keyboard is open.
 * 
 * Handles:
 * - iOS Safari (visualViewport with offsetTop quirks)
 * - Android Chrome (visualViewport)
 * - Fallback: returns 0 if visualViewport not available
 * 
 * QA Checklist:
 * - [ ] iOS Safari: open drawer → focus textarea → keyboard opens → CTA visible
 * - [ ] Android Chrome: same test
 * - [ ] iPhone SE dimensions: small screen test
 * - [ ] Rotate orientation while keyboard open
 */
export function useKeyboardInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const initialViewportHeight = useRef<number | null>(null);

  const updateKeyboardInset = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setKeyboardInset(0);
      setIsKeyboardOpen(false);
      return;
    }

    // Store initial height on first call
    if (initialViewportHeight.current === null) {
      initialViewportHeight.current = vv.height;
    }

    // Calculate keyboard height
    // On iOS, the viewport shrinks when keyboard opens
    // On Android, similar behavior but with offsetTop
    const windowHeight = window.innerHeight;
    const viewportHeight = vv.height;
    const offsetTop = vv.offsetTop || 0;
    
    // The keyboard inset is the difference between window and viewport
    // Plus any offset (iOS scroll compensation)
    const inset = Math.max(0, windowHeight - viewportHeight - offsetTop);
    
    // Threshold to avoid false positives from address bar changes
    const keyboardThreshold = 100; // Keyboards are typically >200px
    const keyboardOpen = inset > keyboardThreshold;
    
    setKeyboardInset(keyboardOpen ? inset : 0);
    setIsKeyboardOpen(keyboardOpen);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // Update on viewport resize (keyboard open/close)
    const handleResize = () => {
      // Use requestAnimationFrame to batch updates and avoid jank
      requestAnimationFrame(updateKeyboardInset);
    };

    // Update on scroll (iOS Safari moves viewport when keyboard opens)
    const handleScroll = () => {
      requestAnimationFrame(updateKeyboardInset);
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleScroll);
    
    // Initial check
    updateKeyboardInset();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleScroll);
    };
  }, [updateKeyboardInset]);

  // Also listen for focus/blur events as backup detection
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to let keyboard animation start
      setTimeout(updateKeyboardInset, 100);
    };

    const handleBlur = () => {
      // Delay to let keyboard close animation
      setTimeout(updateKeyboardInset, 100);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [updateKeyboardInset]);

  return {
    keyboardInset,
    isKeyboardOpen,
  };
}

/**
 * Scroll a focused element into view within a scrollable container
 * Call this on input focus for optimal keyboard UX
 */
export function scrollInputIntoView(
  element: HTMLElement | null,
  scrollContainer: HTMLElement | null,
  options?: { offset?: number; behavior?: ScrollBehavior }
) {
  if (!element || !scrollContainer) return;

  const { offset = 100, behavior = 'smooth' } = options || {};

  // Wait a frame for keyboard to appear
  requestAnimationFrame(() => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    
    // Calculate if element is below visible area
    const isBelow = elementRect.bottom > containerRect.bottom - offset;
    const isAbove = elementRect.top < containerRect.top + offset;
    
    if (isBelow || isAbove) {
      // Scroll element to center of visible area
      const elementOffsetTop = element.offsetTop;
      const targetScroll = elementOffsetTop - (containerRect.height / 3);
      
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior,
      });
    }
  });
}

/**
 * Dismiss keyboard by blurring active element
 */
export function dismissKeyboard() {
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && typeof activeElement.blur === 'function') {
    activeElement.blur();
  }
}
