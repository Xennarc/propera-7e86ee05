import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface GuestSession {
  guestId: string;
  fullName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  resortId: string;
  resortName?: string;
  resortLogoUrl?: string;
}

// Re-export for backward compatibility - branding now fetched dynamically via useResortBranding hook
// resortLogoUrl in session is kept for backward compat but useResortBranding is preferred

interface GuestAuthContextType {
  guest: GuestSession | null;
  loading: boolean;
  login: (resortId: string, roomNumber: string, lastName: string, pin: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined);

// Simple hash function for PIN (SHA-256)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const GUEST_SESSION_KEY = 'propera_guest_session';

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession) as GuestSession;
          // Check if stay is still valid
          const today = new Date().toISOString().split('T')[0];
          if (parsed.checkOutDate >= today) {
            // If resortName or resortLogoUrl is missing, fetch them
            if ((!parsed.resortName || parsed.resortLogoUrl === undefined) && parsed.resortId) {
              try {
                const { data: resortData } = await supabase
                  .from('resorts')
                  .select('name, login_logo_url')
                  .eq('id', parsed.resortId)
                  .single();
                if (resortData) {
                  parsed.resortName = resortData.name || parsed.resortName;
                  parsed.resortLogoUrl = resortData.login_logo_url || undefined;
                  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(parsed));
                }
              } catch {
                // Ignore, resort info is optional
              }
            }
            setGuest(parsed);
          } else {
            localStorage.removeItem(GUEST_SESSION_KEY);
          }
        } catch {
          localStorage.removeItem(GUEST_SESSION_KEY);
        }
      }
      setLoading(false);
    };
    
    restoreSession();
  }, []);

  const login = async (resortId: string, roomNumber: string, lastName: string, pin: string): Promise<{ error: string | null }> => {
    try {
      // Validate inputs
      if (!roomNumber.trim() || !lastName.trim() || !pin.trim()) {
        return { error: 'Please fill in all fields.' };
      }

      if (!/^\d{4,6}$/.test(pin)) {
        return { error: 'Your PIN should be 4-6 digits.' };
      }

      const pinHash = await hashPin(pin);

      const { data, error } = await supabase.rpc('guest_portal_login', {
        p_resort_id: resortId,
        p_room_number: roomNumber.trim(),
        p_last_name: lastName.trim(),
        p_pin_hash: pinHash,
      });

      if (error) {
        console.error('Login error:', error);
        return { error: 'We couldn\'t sign you in. Please try again or contact reception.' };
      }

      if (!data || data.length === 0) {
        return { error: 'We couldn\'t find a guest with those details. Please check your room number, last name, and PIN.' };
      }

      const guestData = data[0];
      
      // Fetch resort info
      let resortName: string | undefined;
      let resortLogoUrl: string | undefined;
      try {
        const { data: resortData } = await supabase
          .from('resorts')
          .select('name, login_logo_url')
          .eq('id', guestData.resort_id)
          .single();
        resortName = resortData?.name;
        resortLogoUrl = resortData?.login_logo_url || undefined;
      } catch {
        // Ignore error, resort info is optional
      }
      
      const session: GuestSession = {
        guestId: guestData.guest_id,
        fullName: guestData.full_name,
        roomNumber: guestData.room_number,
        checkInDate: guestData.check_in_date,
        checkOutDate: guestData.check_out_date,
        resortId: guestData.resort_id,
        resortName,
        resortLogoUrl,
      };

      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
      setGuest(session);
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'Something went wrong. Please try again or contact reception.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(GUEST_SESSION_KEY);
    setGuest(null);
    // Note: If you need to invalidate branding cache on logout, 
    // use queryClient.invalidateQueries from the component
  };

  return (
    <GuestAuthContext.Provider value={{ guest, loading, login, logout }}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const context = useContext(GuestAuthContext);
  if (context === undefined) {
    throw new Error('useGuestAuth must be used within a GuestAuthProvider');
  }
  return context;
}

// Helper to generate PIN hash (for staff when enabling portal)
export async function generatePinHash(pin: string): Promise<string> {
  return hashPin(pin);
}
