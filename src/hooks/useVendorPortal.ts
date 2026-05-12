import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VENDOR_SESSION_KEY = 'vendor_session_token';

export interface VendorSession {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
}

export interface VendorBooking {
  booking_id: string;
  session_id: string;
  resort_id: string;
  resort_name: string;
  activity_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  guest_name: string;
  room_number: string;
  num_adults: number;
  num_children: number;
  notes: string | null;
  vendor_status: 'PENDING_ACK' | 'ACKED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW';
  total_amount: number;
  created_at: string;
}

export function useVendorPortal() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem(VENDOR_SESSION_KEY);
      if (!token) {
        setIsValidating(false);
        return;
      }

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any).rpc('validate_vendor_session', {
        p_token: token,
      });

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        localStorage.removeItem(VENDOR_SESSION_KEY);
        setSession(null);
      } else {
        const row = data[0];
        setSession({
          vendorId: row.vendor_id,
          vendorName: row.vendor_name,
          vendorEmail: row.vendor_email,
        });
      }
      setIsValidating(false);
    };

    validateSession();
  }, []);

  // Request login code
  const requestCodeMutation = useMutation({
    mutationFn: async (email: string) => {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Find vendor by email
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (vendorError || !vendor) {
        throw new Error('No active vendor found with this email');
      }

      // Store hashed code in database - cast to any since types may not be regenerated yet
      const { error: codeError } = await (supabase as any)
        .from('vendor_login_codes')
        .insert({
          vendor_id: vendor.id,
          email,
          code_hash: await hashCode(code),
        });

      if (codeError) throw codeError;

      // In production, send email here
      // For now, log to console (would use Resend in production)

      return { vendorName: vendor.name };
    },
    onSuccess: (data) => {
      toast({ title: `Code sent to your email`, description: `Welcome, ${data.vendorName}` });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Verify login code
  const verifyCodeMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any).rpc('verify_vendor_login_code', {
        p_email: email,
        p_code: code,
      });

      if (error) throw error;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid or expired code');
      }

      const row = data[0];
      localStorage.setItem(VENDOR_SESSION_KEY, row.session_token);

      // Fetch vendor info
      const { data: vendorData } = await (supabase as any).rpc('validate_vendor_session', {
        p_token: row.session_token,
      });

      if (vendorData && Array.isArray(vendorData) && vendorData.length > 0) {
        const vendorRow = vendorData[0];
        setSession({
          vendorId: vendorRow.vendor_id,
          vendorName: vendorRow.vendor_name,
          vendorEmail: vendorRow.vendor_email,
        });
      }

      return row;
    },
    onSuccess: () => {
      toast({ title: 'Logged in successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(VENDOR_SESSION_KEY);
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  // Fetch vendor bookings
  const bookingsQuery = useQuery({
    queryKey: ['vendor-portal-bookings', session?.vendorId],
    queryFn: async () => {
      if (!session?.vendorId) return [];

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any).rpc('get_vendor_bookings', {
        p_vendor_id: session.vendorId,
        p_status_filter: null,
      });

      if (error) throw error;
      return (data || []) as VendorBooking[];
    },
    enabled: !!session?.vendorId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Acknowledge booking
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ bookingId, action }: { bookingId: string; action: 'ACK' | 'DECLINE' }) => {
      if (!session?.vendorId) throw new Error('Not authenticated');

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any).rpc('vendor_acknowledge_booking', {
        p_booking_id: bookingId,
        p_vendor_id: session.vendorId,
        p_action: action,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to update booking');

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-portal-bookings'] });
      toast({ 
        title: variables.action === 'ACK' ? 'Booking acknowledged' : 'Booking declined',
      });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Complete booking
  const completeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!session?.vendorId) throw new Error('Not authenticated');

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any).rpc('vendor_complete_booking', {
        p_booking_id: bookingId,
        p_vendor_id: session.vendorId,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to complete booking');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-portal-bookings'] });
      toast({ title: 'Booking marked as completed' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  return {
    session,
    isValidating,
    isAuthenticated: !!session,
    bookings: bookingsQuery.data || [],
    isLoadingBookings: bookingsQuery.isLoading,
    requestCode: requestCodeMutation.mutateAsync,
    verifyCode: verifyCodeMutation.mutateAsync,
    logout,
    acknowledgeBooking: acknowledgeMutation.mutateAsync,
    completeBooking: completeMutation.mutateAsync,
    isRequestingCode: requestCodeMutation.isPending,
    isVerifyingCode: verifyCodeMutation.isPending,
    isAcknowledging: acknowledgeMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}

// Simple hash function for code (in production, use proper crypto)
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
