import { useEffect } from 'react';

/**
 * Universal viewport height hook.
 * 
 * Sets --app-height on <html> to window.innerHeight, which excludes
 * browser chrome (toolbars) on ALL mobile browsers. This is the only
 * reliable cross-device way to size a full-screen container.
 * 
 * Listens to both window.resize and visualViewport.resize to catch
 * toolbar show/hide, orientation changes, and keyboard open/close.
 * Debounces rapid updates (e.g. scroll-triggered toolbar transitions).
 */
export function useViewportHeight() {
  useEffect(() => {
    let rafId: number | null = null;

    const update = () => {
      // Cancel any pending frame to debounce rapid events
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const vh = window.visualViewport?.height ?? window.innerHeight;
        document.documentElement.style.setProperty('--app-height', `${vh}px`);
        rafId = null;
      });
    };

    // Set immediately on mount
    update();

    // Listen to both resize sources
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
}
