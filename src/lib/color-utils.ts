/**
 * Color Utility Functions
 * Converts hex colors to HSL format for CSS variable compatibility
 */

/**
 * Convert a hex color to HSL values in the format required by CSS variables
 * e.g., "#0E7490" → "188 82% 31%"
 * 
 * This format works with Tailwind's hsl() wrapper in CSS variables.
 */
export function hexToHSL(hex: string | null | undefined): string | null {
  if (!hex) return null;
  
  // Remove # if present and validate
  const cleanHex = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    console.warn(`Invalid hex color: ${hex}`);
    return null;
  }
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  // Find min and max RGB values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // Calculate lightness
  let l = (max + min) / 2;
  
  // Calculate saturation
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  }
  
  // Calculate hue
  let h = 0;
  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }
  
  // Convert to degrees and percentages, round to integers
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Check if a color string is a valid hex color
 */
export function isValidHex(hex: string | null | undefined): boolean {
  if (!hex) return false;
  const cleanHex = hex.replace('#', '');
  return /^[0-9A-Fa-f]{6}$/.test(cleanHex);
}

/**
 * Get a contrasting foreground color (black or white) for a given hex background
 * Uses the relative luminance formula for accessibility
 */
export function getContrastingForeground(hex: string | null | undefined): 'dark' | 'light' {
  if (!hex) return 'dark';
  
  const cleanHex = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) return 'dark';
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Calculate relative luminance (simplified formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return 'dark' for light backgrounds (need dark text), 'light' for dark backgrounds
  return luminance > 0.5 ? 'dark' : 'light';
}
