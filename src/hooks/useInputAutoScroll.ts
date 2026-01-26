import { useEffect } from 'react';

/**
 * useInputAutoScroll - Automatically scrolls focused inputs into view
 * 
 * Attach to any scrollable container that contains form inputs.
 * When an input receives focus, it will be scrolled into view with
 * enough padding to remain visible above the keyboard.
 * 
 * @param containerRef - Ref to the scrollable container element
 * @param options - Configuration options
 */
export function useInputAutoScroll(
  containerRef: React.RefObject<HTMLElement>,
  options?: { 
    /** Buffer space above keyboard (default: 200px) */
    keyboardBuffer?: number;
    /** Additional padding after scroll (default: 40px) */
    scrollPadding?: number;
    /** Delay to allow keyboard animation (default: 150ms) */
    delay?: number;
  }
) {
  const { 
    keyboardBuffer = 200, 
    scrollPadding = 40, 
    delay = 150 
  } = options || {};

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox';
      
      if (!isInput) return;

      // Delay to let keyboard animate open
      setTimeout(() => {
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if element is below visible area
        const visibleBottom = containerRect.bottom - keyboardBuffer;
        
        if (targetRect.bottom > visibleBottom) {
          const scrollAmount = targetRect.bottom - visibleBottom + scrollPadding;
          container.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          });
        }
        
        // Also check if element is above visible area
        const visibleTop = containerRect.top + scrollPadding;
        if (targetRect.top < visibleTop) {
          const scrollAmount = targetRect.top - visibleTop - scrollPadding;
          container.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          });
        }
      }, delay);
    };

    container.addEventListener('focusin', handleFocus);
    return () => container.removeEventListener('focusin', handleFocus);
  }, [containerRef, keyboardBuffer, scrollPadding, delay]);
}
