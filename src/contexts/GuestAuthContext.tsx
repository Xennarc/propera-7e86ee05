import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceInfo } from '@/lib/device-info';

export interface GuestSession {
  guestId: string;
  fullName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  resortId: string;
  resortName?: string;
  resortLogoUrl?: string;
  resortTimezone?: string;
  sessionId?: string;
  sessionToken?: string;
  stayId?: string; // Links to guest_stays table for unified stay tracking
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

export const GUEST_SESSION_KEY = 'propera_guest_session';
interface SessionRegistrationResult {
  success: boolean;
  session_id?: string;
  session_token?: string;
  error?: string;
}

interface SessionValidationResult {
  success: boolean;
  session_id?: string;
  guest_id?: string;
  resort_id?: string;
  error?: string;
  reason?: string;
}

// Register a new session with device info
async function registerSession(guestId: string, resortId: string): Promise<{ sessionId?: string; sessionToken?: string }> {
  try {
    const deviceInfo = await getDeviceInfo();
    
    const { data, error } = await supabase.rpc('register_guest_session', {
      p_guest_id: guestId,
      p_resort_id: resortId,
      p_device_fingerprint: deviceInfo.fingerprint,
      p_device_name: deviceInfo.deviceName,
      p_device_type: deviceInfo.deviceType,
      p_browser_name: deviceInfo.browserName,
      p_os_name: deviceInfo.osName,
    });

    if (error) {
      console.error('Failed to register session:', error);
      return {};
    }

    const result = data as unknown as SessionRegistrationResult;
    if (result.success) {
      return {
        sessionId: result.session_id,
        sessionToken: result.session_token,
      };
    }
    return {};
  } catch (err) {
    console.error('Error registering session:', err);
    return {};
  }
}

// Validate an existing session token
async function validateSession(sessionToken: string): Promise<SessionValidationResult> {
  try {
    const { data, error } = await supabase.rpc('validate_guest_session', {
      p_session_token: sessionToken,
    });

    if (error) {
      console.error('Failed to validate session:', error);
      return { success: false, error: 'VALIDATION_ERROR' };
    }

    return data as unknown as SessionValidationResult;
  } catch (err) {
    console.error('Error validating session:', err);
    return { success: false, error: 'VALIDATION_ERROR' };
  }
}

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
      
      if (storedSession) {
        try {
          const rawParsed = JSON.parse(storedSession);
          // Normalize all fields to strings to prevent React error #300
          const parsed: GuestSession = {
            guestId: String(rawParsed.guestId ?? ''),
            fullName: String(rawParsed.fullName ?? 'Guest'),
            roomNumber: String(rawParsed.roomNumber ?? ''),
            checkInDate: String(rawParsed.checkInDate ?? ''),
            checkOutDate: String(rawParsed.checkOutDate ?? ''),
            resortId: String(rawParsed.resortId ?? ''),
            resortName: rawParsed.resortName ? String(rawParsed.resortName) : undefined,
            resortLogoUrl: rawParsed.resortLogoUrl ? String(rawParsed.resortLogoUrl) : undefined,
            resortTimezone: rawParsed.resortTimezone ? String(rawParsed.resortTimezone) : 'UTC',
            sessionId: rawParsed.sessionId ? String(rawParsed.sessionId) : undefined,
            sessionToken: rawParsed.sessionToken ? String(rawParsed.sessionToken) : undefined,
            stayId: rawParsed.stayId ? String(rawParsed.stayId) : undefined,
          };
          
          // Check if stay is still valid (basic check)
          const today = new Date().toISOString().split('T')[0];
          if (parsed.checkOutDate >= today) {
            // If we have a session token, validate it
            if (parsed.sessionToken) {
              const validation = await validateSession(parsed.sessionToken);
              if (!validation.success) {
                // Session revoked or invalid - clear and logout
                console.log('Session invalid or revoked:', validation.error, validation.reason);
                localStorage.removeItem(GUEST_SESSION_KEY);
                setLoading(false);
                return;
              }
            }

            // If resortName or resortLogoUrl is missing, fetch them
            if ((!parsed.resortName || parsed.resortLogoUrl === undefined || !parsed.resortTimezone) && parsed.resortId) {
              try {
                const { data: resortData } = await supabase
                  .from('resorts')
                  .select('name, login_logo_url, timezone')
                  .eq('id', parsed.resortId)
                  .single();
                if (resortData) {
                  parsed.resortName = String(resortData.name || parsed.resortName || '');
                  parsed.resortLogoUrl = resortData.login_logo_url ? String(resortData.login_logo_url) : undefined;
                  parsed.resortTimezone = String(resortData.timezone || 'UTC');
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
      } else {
        // No active session - clean up stale prearrival redirect data if present
        // (This handles edge case where session was cleared but redirect data remains)
        const prearrivalRedirect = localStorage.getItem('prearrival_guest_redirect');
        if (prearrivalRedirect) {
          try {
            const redirect = JSON.parse(prearrivalRedirect);
            // If autoLoginAt exists, session was supposed to be established
            // but got cleared somehow - clean up stale redirect
            if (redirect.autoLoginAt) {
              localStorage.removeItem('prearrival_guest_redirect');
            }
          } catch {
            localStorage.removeItem('prearrival_guest_redirect');
          }
        }
      }
      setLoading(false);
    };
    
    restoreSession();
  }, []);

  const login = async (resortId: string, roomNumber: string, lastName: string, pin: string): Promise<{ error: string | null }> => {
    const attemptLogin = async (): Promise<{ data: any; error: any }> => {
      const pinHash = await hashPin(pin);
      return supabase.rpc('guest_portal_login', {
        p_resort_id: resortId,
        p_room_number: roomNumber.trim(),
        p_last_name: lastName.trim(),
        p_pin_hash: pinHash,
      });
    };

    try {
      // Validate inputs
      if (!roomNumber.trim() || !lastName.trim() || !pin.trim()) {
        return { error: 'Please fill in all fields.' };
      }

      if (!/^\d{4,6}$/.test(pin)) {
        return { error: 'Your PIN should be 4-6 digits.' };
      }

      // First attempt
      let { data, error } = await attemptLogin();

      // Retry once after short delay if no data found (handles propagation latency)
      if (!error && (!data || data.length === 0)) {
        await new Promise(resolve => setTimeout(resolve, 600));
        const retry = await attemptLogin();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Login error:', error);
        // Check for rate limit error (without exposing details)
        if (error.message?.includes('Rate limit exceeded')) {
          return { error: 'Too many login attempts. Please wait a few minutes and try again.' };
        }
        return { error: 'We couldn\'t sign you in. Please try again or contact reception.' };
      }

      if (!data || data.length === 0) {
        return { error: 'We couldn\'t find a guest with those details. Please check your room number, last name, and PIN.' };
      }

      const guestData = data[0];
      
      // Fetch resort info
      let resortName: string | undefined;
      let resortLogoUrl: string | undefined;
      let resortTimezone: string = 'UTC';
      try {
        const { data: resortData } = await supabase
          .from('resorts')
          .select('name, login_logo_url, timezone')
          .eq('id', guestData.resort_id)
          .single();
        resortName = resortData?.name;
        resortLogoUrl = resortData?.login_logo_url || undefined;
        resortTimezone = resortData?.timezone || 'UTC';
      } catch {
        // Ignore error, resort info is optional
      }

      // Register a session for this device
      const { sessionId, sessionToken } = await registerSession(guestData.guest_id, guestData.resort_id);
      
      const session: GuestSession = {
        guestId: String(guestData.guest_id ?? ''),
        fullName: String(guestData.full_name ?? 'Guest'),
        roomNumber: String(guestData.room_number ?? ''),
        checkInDate: String(guestData.check_in_date ?? ''),
        checkOutDate: String(guestData.check_out_date ?? ''),
        resortId: String(guestData.resort_id ?? ''),
        resortName: resortName ? String(resortName) : undefined,
        resortLogoUrl: resortLogoUrl ? String(resortLogoUrl) : undefined,
        resortTimezone: String(resortTimezone || 'UTC'),
        sessionId: sessionId ? String(sessionId) : undefined,
        sessionToken: sessionToken ? String(sessionToken) : undefined,
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
    // Revoke the current session if we have a token
    const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as GuestSession;
        if (parsed.sessionId && parsed.guestId) {
          // Fire and forget - don't wait for revocation
          void supabase.rpc('revoke_guest_session', {
            p_session_id: parsed.sessionId,
            p_guest_id: parsed.guestId,
            p_reason: 'user_logout',
          });
        }
      } catch {
        // Ignore parse errors
      }
    }

    localStorage.removeItem(GUEST_SESSION_KEY);
    setGuest(null);
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

/**
 * Utility to build a normalized GuestSession from raw data.
 * Ensures all fields are properly stringified to prevent React error #300.
 * Use this in all login flows for consistency.
 */
export function buildGuestSession(params: {
  guest: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
  resort: {
    id: string;
    name: string;
    logo_url?: string | null;
    timezone?: string | null;
  };
  sessionId?: string;
  sessionToken?: string;
  stayId?: string;
}): GuestSession {
  return {
    guestId: String(params.guest.id ?? ''),
    fullName: String(params.guest.full_name ?? 'Guest'),
    roomNumber: String(params.guest.room_number ?? ''),
    checkInDate: String(params.guest.check_in_date ?? ''),
    checkOutDate: String(params.guest.check_out_date ?? ''),
    resortId: String(params.resort.id ?? ''),
    resortName: params.resort.name ? String(params.resort.name) : undefined,
    resortLogoUrl: params.resort.logo_url ? String(params.resort.logo_url) : undefined,
    resortTimezone: params.resort.timezone ? String(params.resort.timezone) : 'UTC',
    sessionId: params.sessionId ? String(params.sessionId) : undefined,
    sessionToken: params.sessionToken ? String(params.sessionToken) : undefined,
    stayId: params.stayId ? String(params.stayId) : undefined,
  };
}
