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

export function ResortProvider({ children }: { children: ReactNode }) {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [currentResort, setCurrentResort] = useState<Resort | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchResorts = async () => {
    if (!user) {
      setResorts([]);
      setCurrentResort(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('resorts')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching resorts:', error);
    } else {
      const typedData = data as Resort[];
      setResorts(typedData);
      
      // Auto-select first resort if none selected
      if (!currentResort && typedData.length > 0) {
        setCurrentResort(typedData[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResorts();
  }, [user]);

  return (
    <ResortContext.Provider
      value={{
        resorts,
        currentResort,
        setCurrentResort,
        loading,
        refetch: fetchResorts,
      }}
    >
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
