export type LandingTheme = 'glass' | 'skeuo';

const STORAGE_KEY = 'propera_landing_theme';

export function getLandingTheme(): LandingTheme {
  if (typeof window === 'undefined') return 'glass';

  const params = new URLSearchParams(window.location.search);
  const paramTheme = params.get('theme');
  if (paramTheme === 'skeuo') return 'skeuo';

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'skeuo') return 'skeuo';
  } catch {
    // localStorage blocked
  }

  return 'glass';
}

export function setLandingTheme(theme: LandingTheme) {
  try {
    if (theme === 'glass') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // localStorage blocked
  }
}

export function isThemeDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debugTheme') === '1';
}
