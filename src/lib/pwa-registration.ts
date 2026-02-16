// PWA service worker registration using vite-plugin-pwa
// Fires a custom event when an update is available so GuestUpdatePrompt can react

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

// PWA status tracking for debug overlay
interface PWAStatus {
  swRegistered: boolean;
  swScopeUrl: string | null;
  cacheVersion: string | null;
  lastUpdateCheck: Date | null;
  updateAvailable: boolean;
}

const pwaStatus: PWAStatus = {
  swRegistered: false,
  swScopeUrl: null,
  cacheVersion: null,
  lastUpdateCheck: null,
  updateAvailable: false,
};

let swRegistration: ServiceWorkerRegistration | null = null;

export function getPWAStatus(): Readonly<PWAStatus> {
  return { ...pwaStatus };
}

export function forceUpdateCheck(): void {
  if (swRegistration) {
    swRegistration.update();
    pwaStatus.lastUpdateCheck = new Date();
  }
}

export async function registerPWA() {
  if (typeof window === 'undefined') return;
  
  try {
    const { registerSW } = await import('virtual:pwa-register');
    
    updateSWFn = registerSW({
      onNeedRefresh() {
        pwaStatus.updateAvailable = true;
        // Dispatch event for GuestUpdatePrompt to pick up
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      },
      onOfflineReady() {
        console.log('[PWA] App ready for offline use');
      },
      onRegisteredSW(swUrl, registration) {
        pwaStatus.swRegistered = true;
        pwaStatus.swScopeUrl = registration?.scope ?? null;
        pwaStatus.cacheVersion = swUrl ? new URL(swUrl, window.location.origin).pathname : null;
        pwaStatus.lastUpdateCheck = new Date();
        swRegistration = registration ?? null;

        // Check for updates every 60 minutes
        if (registration) {
          setInterval(() => {
            registration.update();
            pwaStatus.lastUpdateCheck = new Date();
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
