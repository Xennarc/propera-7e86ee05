import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEMO_WORKSPACE_KEY = 'propera_demo_workspace_id';
const DEMO_EMAIL_KEY = 'propera_demo_email';

export interface DemoWorkspace {
  id: string;
  email: string;
  resort_name: string;
  resort_id: string | null;
  resort_code: string | null;
  timezone: string | null;
  rooms_range: string | null;
  departments: string[] | null;
  status: 'pending' | 'creating' | 'ready' | 'failed';
  staff_user_id: string | null;
  staff_email: string | null;
  guest_id: string | null;
  guest_room: string | null;
  guest_last_name: string | null;
  created_at: string;
  expires_at: string;
  last_error: string | null;
}

export interface DemoTokens {
  staff_token?: string;
  guest_token?: string;
  expires_in_minutes: number;
}

export interface DemoCredentials {
  email: string;
  temp_password?: string;
  tenant_id?: string;
  resort_code?: string;
  staff_login_url?: string;
  staff_token_url?: string;
  guest_login?: {
    guest_name: string;
    room_number: string;
    last_name: string;
    pin: string;
    portal_url: string;
    token_url?: string;
  } | null;
  email_sent?: boolean;
  email_error?: string;
  workspace_id?: string;
}

export function useDemoWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEMO_WORKSPACE_KEY);
    }
    return null;
  });
  
  const [savedEmail, setSavedEmail] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEMO_EMAIL_KEY);
    }
    return null;
  });

  const [workspace, setWorkspace] = useState<DemoWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save workspace ID to localStorage
  const saveWorkspace = useCallback((id: string, email: string) => {
    localStorage.setItem(DEMO_WORKSPACE_KEY, id);
    localStorage.setItem(DEMO_EMAIL_KEY, email);
    setWorkspaceId(id);
    setSavedEmail(email);
  }, []);

  // Clear workspace from localStorage
  const clearWorkspace = useCallback(() => {
    localStorage.removeItem(DEMO_WORKSPACE_KEY);
    localStorage.removeItem(DEMO_EMAIL_KEY);
    setWorkspaceId(null);
    setSavedEmail(null);
    setWorkspace(null);
  }, []);

  // Fetch workspace status
  const fetchWorkspace = useCallback(async (email?: string): Promise<DemoWorkspace | null> => {
    const emailToUse = email || savedEmail;
    if (!emailToUse) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: emailToUse.trim().toLowerCase(),
          mode: 'get-workspace',
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.workspace) {
        const ws = data.workspace as DemoWorkspace;
        setWorkspace(ws);
        saveWorkspace(ws.id, ws.email);
        return ws;
      }

      return null;
    } catch (err: any) {
      console.error('Failed to fetch workspace:', err);
      setError(err.message || 'Failed to fetch workspace');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [savedEmail, saveWorkspace]);

  // Generate fresh tokens for auto-login
  const generateTokens = useCallback(async (): Promise<DemoTokens | null> => {
    if (!savedEmail) return null;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: savedEmail.trim().toLowerCase(),
          mode: 'generate-tokens',
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        return {
          staff_token: data.staff_token,
          guest_token: data.guest_token,
          expires_in_minutes: 15,
        };
      }

      return null;
    } catch (err: any) {
      console.error('Failed to generate tokens:', err);
      return null;
    }
  }, [savedEmail]);

  // Regenerate credentials
  const regenerateCredentials = useCallback(async (): Promise<DemoCredentials | null> => {
    if (!savedEmail) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: savedEmail.trim().toLowerCase(),
          mode: 'regenerate-credentials',
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        return {
          email: data.email,
          temp_password: data.temp_password,
          tenant_id: data.tenant_id,
          resort_code: data.resort_code,
          staff_login_url: data.staff_login_url,
          staff_token_url: data.staff_token_url,
          guest_login: data.guest_login,
          email_sent: data.email_sent,
          workspace_id: data.workspace_id,
        };
      }

      throw new Error(data?.error || 'Failed to regenerate credentials');
    } catch (err: any) {
      console.error('Failed to regenerate credentials:', err);
      setError(err.message || 'Failed to regenerate credentials');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [savedEmail]);

  // Re-seed demo data
  const reseedData = useCallback(async (): Promise<boolean> => {
    if (!savedEmail) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: savedEmail.trim().toLowerCase(),
          mode: 'reseed',
        }
      });

      if (fnError) throw fnError;

      return data?.success === true;
    } catch (err: any) {
      console.error('Failed to reseed data:', err);
      setError(err.message || 'Failed to reseed data');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [savedEmail]);

  // Check if there's an existing workspace on mount
  useEffect(() => {
    if (savedEmail && !workspace) {
      fetchWorkspace(savedEmail);
    }
  }, [savedEmail, workspace, fetchWorkspace]);

  return {
    workspaceId,
    workspace,
    savedEmail,
    isLoading,
    error,
    hasExistingWorkspace: !!savedEmail,
    saveWorkspace,
    clearWorkspace,
    fetchWorkspace,
    generateTokens,
    regenerateCredentials,
    reseedData,
  };
}

// Utility to detect user's timezone
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// Map detected timezone to supported list
export function mapToSupportedTimezone(detected: string): string {
  const mapping: Record<string, string> = {
    // Maldives
    'Indian/Maldives': 'Indian/Maldives',
    'Asia/Colombo': 'Indian/Maldives',
    
    // Thailand / Indonesia
    'Asia/Bangkok': 'Asia/Bangkok',
    'Asia/Jakarta': 'Asia/Jakarta',
    'Asia/Ho_Chi_Minh': 'Asia/Bangkok',
    'Asia/Phnom_Penh': 'Asia/Bangkok',
    
    // Philippines
    'Asia/Manila': 'Asia/Manila',
    
    // Caribbean / Mexico
    'America/Cancun': 'America/Cancun',
    'America/Jamaica': 'America/Cancun',
    'America/Nassau': 'America/Cancun',
    'America/Cayman': 'America/Cancun',
    'America/Santo_Domingo': 'America/Cancun',
    
    // UAE
    'Asia/Dubai': 'Asia/Dubai',
    'Asia/Muscat': 'Asia/Dubai',
    
    // Mauritius / Seychelles
    'Indian/Mauritius': 'Indian/Mauritius',
    'Indian/Mahe': 'Indian/Mahe',
  };
  
  // Check for exact match
  if (mapping[detected]) {
    return mapping[detected];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(mapping)) {
    if (detected.includes(key.split('/')[1]) || key.includes(detected.split('/')[1])) {
      return value;
    }
  }
  
  // Default fallback
  return 'UTC';
}
