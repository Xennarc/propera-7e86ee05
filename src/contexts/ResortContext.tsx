import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const setCurrentResort = (resort: Resort | null) => {
    setCurrentResortState(resort);
    if (resort) {
      localStorage.setItem(CURRENT_RESORT_KEY, resort.id);
    } else {
      localStorage.removeItem(CURRENT_RESORT_KEY);
    }
  };

  const restoreOrSelectResort = (availableResorts: Resort[]) => {
    if (availableResorts.length === 0) {
      setCurrentResortState(null);
      return;
    }
    const savedResortId = localStorage.getItem(CURRENT_RESORT_KEY);
    if (savedResortId) {
      const savedResort = availableResorts.find(r => r.id === savedResortId);
      if (savedResort) {
        setCurrentResortState(savedResort);
        return;
      }
    }
    if (!currentResort || !availableResorts.find(r => r.id === currentResort.id)) {
      setCurrentResortState(availableResorts[0]);
    }
  };

  const fetchResorts = async () => {
    if (!user) {
      setResorts([]);
      setCurrentResortState(null);
      setLoading(false);
      return;
    }
    
    // Wait for user data (including memberships) to finish loading
    if (userDataLoading) {
      return;
    }
    
    // Only show loading state if we don't have any resorts yet
    // This prevents flicker and null access during refetch
    if (resorts.length === 0) {
      setLoading(true);
    }
    
    if (isSuperAdmin()) {
      const { data, error } = await supabase.from('resorts').select('*').order('name');
      if (!error && data) {
        const typedData = data as Resort[];
        setResorts(typedData);
        restoreOrSelectResort(typedData);
      }
    } else {
      const memberResortIds = memberships.map(m => m.resort_id);
      if (memberResortIds.length === 0) {
        setResorts([]);
        setCurrentResortState(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from('resorts').select('*').in('id', memberResortIds).order('name');
      if (!error && data) {
        const typedData = data as Resort[];
        setResorts(typedData);
        restoreOrSelectResort(typedData);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Keep loading true while waiting for user data
    if (userDataLoading) {
      setLoading(true);
      return;
    }
    if (user) fetchResorts();
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
