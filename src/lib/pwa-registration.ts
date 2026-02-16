// PWA service worker registration using vite-plugin-pwa
// Fires a custom event when an update is available so GuestUpdatePrompt can react

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

export async function registerPWA() {
  if (typeof window === 'undefined') return;
  
  try {
    const { registerSW } = await import('virtual:pwa-register');
    
    updateSWFn = registerSW({
      onNeedRefresh() {
        // Dispatch event for GuestUpdatePrompt to pick up
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      },
      onOfflineReady() {
        console.log('[PWA] App ready for offline use');
      },
      onRegisteredSW(swUrl, registration) {
        // Check for updates every 60 minutes
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
    });
  } catch (e) {
    // SW registration not available (e.g. dev mode, http)
    console.log('[PWA] Service worker registration skipped:', e);
  }
}

export function updateServiceWorker() {
  if (updateSWFn) {
    updateSWFn(true);
  }
}
