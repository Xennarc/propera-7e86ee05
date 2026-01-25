import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resort } from '@/types/database';
import { useAuth } from './AuthContext';

interface ResortContextType {
  resorts: Resort[];
  currentResort: Resort | null;
  setCurrentResort: (resort: Resort | null) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ResortContext = createContext<ResortContextType | undefined>(undefined);

const CURRENT_RESORT_KEY = 'propera-current-resort-id';

export function ResortProvider({ children }: { children: ReactNode }) {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [currentResort, setCurrentResortState] = useState<Resort | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isSuperAdmin, memberships, userDataLoading } = useAuth();
  const superAdmin = isSuperAdmin();
  
  // Track if we've ever successfully loaded resorts - prevents transient null
  const hasEverLoadedRef = useRef(false);

  const setCurrentResort = (resort: Resort | null) => {
    setCurrentResortState(resort);
    if (resort) {
      localStorage.setItem(CURRENT_RESORT_KEY, resort.id);
    } else {
      localStorage.removeItem(CURRENT_RESORT_KEY);
    }
  };

  // Stale-while-revalidate: Only update currentResort when we have new data
  // Never null it out during refetch transitions
  const restoreOrSelectResort = (availableResorts: Resort[], forceUpdate = false) => {
    if (availableResorts.length === 0) {
      // Only null out if this is a confirmed "no resorts" state, not a transient one
      if (hasEverLoadedRef.current && forceUpdate) {
        setCurrentResortState(null);
      }
      return;
    }
    
    // First, try to restore from localStorage
    const savedResortId = localStorage.getItem(CURRENT_RESORT_KEY);
    if (savedResortId) {
      const savedResort = availableResorts.find(r => r.id === savedResortId);
      if (savedResort) {
        setCurrentResortState(savedResort);
        return;
      }
    }
    
    // If we have a current resort, check if it's still valid
    if (currentResort) {
      const stillExists = availableResorts.find(r => r.id === currentResort.id);
      if (stillExists) {
        // Keep current resort, but update it with fresh data
        setCurrentResortState(stillExists);
        return;
      }
    }
    
    // Otherwise, select the first available resort
    setCurrentResortState(availableResorts[0]);
  };

  const fetchResorts = async () => {
    // User signed out - clear everything
    if (!user) {
      setResorts([]);
      setCurrentResortState(null);
      setLoading(false);
      hasEverLoadedRef.current = false;
      return;
    }
    
    // Wait for user data (including memberships) to finish loading
    if (userDataLoading) {
      return;
    }
    
    // CRITICAL: Only show loading state on INITIAL load
    // During refetch, keep existing data stable (stale-while-revalidate)
    const isInitialLoad = !hasEverLoadedRef.current && resorts.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      let fetchedResorts: Resort[] = [];
      
      if (isSuperAdmin()) {
        const { data, error } = await supabase.from('resorts').select('*').order('name');
        if (!error && data) {
          fetchedResorts = data as Resort[];
        }
      } else {
        const memberResortIds = memberships.map(m => m.resort_id);
        if (memberResortIds.length === 0) {
          // User has no memberships - confirmed empty state
          setResorts([]);
          if (hasEverLoadedRef.current) {
            setCurrentResortState(null);
          }
          hasEverLoadedRef.current = true;
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.from('resorts').select('*').in('id', memberResortIds).order('name');
        if (!error && data) {
          fetchedResorts = data as Resort[];
        }
      }
      
      // Only update state if we got valid data
      if (fetchedResorts.length > 0) {
        setResorts(fetchedResorts);
        restoreOrSelectResort(fetchedResorts, true);
        hasEverLoadedRef.current = true;
      } else if (!hasEverLoadedRef.current) {
        // First load with no resorts - set confirmed empty state
        setResorts([]);
        setCurrentResortState(null);
        hasEverLoadedRef.current = true;
      }
      // If hasEverLoaded and fetchedResorts is empty, keep existing state (transient error)
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep loading true while waiting for user data
    if (userDataLoading) {
      if (!hasEverLoadedRef.current) {
        setLoading(true);
      }
      return;
    }
    if (user) {
      fetchResorts();
    } else {
      // User logged out
      setResorts([]);
      setCurrentResortState(null);
      setLoading(false);
      hasEverLoadedRef.current = false;
    }
  }, [user, memberships.length, superAdmin, userDataLoading]);

  return (
    <ResortContext.Provider value={{ resorts, currentResort, setCurrentResort, loading, refetch: fetchResorts }}>
      {children}
    </ResortContext.Provider>
  );
}

export function useResort() {
  const context = useContext(ResortContext);
  if (context === undefined) {
    throw new Error('useResort must be used within a ResortProvider');
  }
  return context;
}
