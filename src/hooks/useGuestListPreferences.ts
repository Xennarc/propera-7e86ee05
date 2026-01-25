import { useState, useEffect, useCallback } from 'react';
import { GuestSortOption } from './useGuestFilters';

export type GuestListDensity = 'compact' | 'comfortable';

export interface GuestListPreferences {
  density: GuestListDensity;
  defaultSort: GuestSortOption;
}

const STORAGE_KEY = 'propera-guest-list-preferences';

const DEFAULT_PREFERENCES: GuestListPreferences = {
  density: 'comfortable',
  defaultSort: 'arrival-asc',
};

function loadPreferences(): GuestListPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        density: parsed.density === 'compact' ? 'compact' : 'comfortable',
        defaultSort: parsed.defaultSort || 'arrival-asc',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: GuestListPreferences): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function useGuestListPreferences() {
  const [preferences, setPreferences] = useState<GuestListPreferences>(loadPreferences);

  // Persist changes to localStorage
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const setDensity = useCallback((density: GuestListDensity) => {
    setPreferences(prev => ({ ...prev, density }));
  }, []);

  const setDefaultSort = useCallback((defaultSort: GuestSortOption) => {
    setPreferences(prev => ({ ...prev, defaultSort }));
  }, []);

  const toggleDensity = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      density: prev.density === 'compact' ? 'comfortable' : 'compact',
    }));
  }, []);

  return {
    preferences,
    setDensity,
    setDefaultSort,
    toggleDensity,
    isCompact: preferences.density === 'compact',
  };
}
