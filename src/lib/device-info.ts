/**
 * Device fingerprinting and info utilities
 * Creates a stable device identifier and extracts device metadata
 */

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browserName: string;
  osName: string;
}

// Generate a stable device fingerprint based on browser characteristics
async function generateFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen info
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);
  components.push(`${window.devicePixelRatio || 1}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Touch support
  components.push(String('ontouchstart' in window));

  // WebGL renderer (if available)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && 'getParameter' in gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      }
    }
  } catch {
    // Ignore WebGL errors
  }

  // Create hash of components
  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Parse user agent for browser info
function getBrowserName(ua: string): string {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'Internet Explorer';
  return 'Unknown Browser';
}

// Parse user agent for OS info
function getOsName(ua: string): string {
  if (ua.includes('Windows NT 10')) return 'Windows 10';
  if (ua.includes('Windows NT')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('CrOS')) return 'Chrome OS';
  return 'Unknown OS';
}

// Determine device type
function getDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

// Generate a human-readable device name
function getDeviceName(ua: string, browserName: string, osName: string): string {
  // Try to get a specific device name for mobile
  const mobileMatch = ua.match(/\((iPhone[^;)]*|iPad[^;)]*|SM-[A-Z0-9]+|Pixel[^;)]*)\)/i);
  if (mobileMatch) {
    return mobileMatch[1].trim();
  }

  // Fall back to browser + OS
  return `${browserName} on ${osName}`;
}

// Cache fingerprint in localStorage to maintain consistency
const FINGERPRINT_KEY = 'propera_device_fingerprint';

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const ua = navigator.userAgent;
  
  // Get or generate fingerprint
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = await generateFingerprint();
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }

  const browserName = getBrowserName(ua);
  const osName = getOsName(ua);
  const deviceType = getDeviceType(ua);
  const deviceName = getDeviceName(ua, browserName, osName);

  return {
    fingerprint,
    deviceName,
    deviceType,
    browserName,
    osName,
  };
}
