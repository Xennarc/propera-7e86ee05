import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

export interface GuestSessionInfo {
  id: string;
  device_name: string;
  device_type: string;
  browser_name: string | null;
  os_name: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

interface SessionsResult {
  success: boolean;
  sessions?: GuestSessionInfo[];
  error?: string;
}

interface RevokeResult {
  success: boolean;
  error?: string;
}

export function useGuestSessions() {
  const { guest } = useGuestAuth();
  const [sessions, setSessions] = useState<GuestSessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current session ID from localStorage
  const getCurrentSessionId = useCallback((): string | null => {
    try {
      const stored = localStorage.getItem('propera_guest_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.sessionId || null;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!guest?.guestId || !guest?.resortId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_guest_sessions', {
        p_guest_id: guest.guestId,
        p_resort_id: guest.resortId,
      });

      if (rpcError) {
        setError('Failed to load sessions');
        console.error('Failed to fetch sessions:', rpcError);
        return;
      }

      const result = data as unknown as SessionsResult;
      if (result.success && result.sessions) {
        const currentSessionId = getCurrentSessionId();
        const sessionsWithCurrent = result.sessions.map(s => ({
          ...s,
          is_current: s.id === currentSessionId,
        }));
        setSessions(sessionsWithCurrent);
      } else {
        setSessions([]);
      }
    } catch (err) {
      setError('Something went wrong');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [guest?.guestId, guest?.resortId, getCurrentSessionId]);

  const revokeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!guest?.guestId) return false;

    try {
      const { data, error: rpcError } = await supabase.rpc('revoke_guest_session', {
        p_session_id: sessionId,
        p_guest_id: guest.guestId,
        p_reason: 'user_revoked',
      });

      if (rpcError) {
        console.error('Failed to revoke session:', rpcError);
        return false;
      }

      const result = data as unknown as RevokeResult;
      if (result.success) {
        // Remove from local state
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error revoking session:', err);
      return false;
    }
  }, [guest?.guestId]);

  // Fetch sessions on mount and when guest changes
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    revokeSession,
    refetch: fetchSessions,
  };
}
