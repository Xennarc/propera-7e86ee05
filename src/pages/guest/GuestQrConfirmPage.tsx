import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth, buildGuestSession, GUEST_SESSION_KEY } from '@/contexts/GuestAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DoorOpen, ShieldCheck, AlertTriangle, XCircle, Clock, User, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDeviceInfo } from '@/lib/device-info';

interface PeekResult {
  success: boolean;
  guest?: {
    id: string;
    full_name: string;
    room_number: string;
  };
  resort?: {
    id: string;
    name: string;
    logo_url?: string;
    timezone?: string;
  };
  token_type?: string;
  expires_at?: string;
  error?: string;
}

interface TokenValidationResult {
  success: boolean;
  guest?: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
  resort?: {
    id: string;
    name: string;
    logo_url?: string;
    timezone?: string;
  };
  token_type?: string;
  error?: string;
}

type PageState = 'loading' | 'confirm' | 'processing' | 'error';

export default function GuestQrConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { guest: existingGuest } = useGuestAuth();
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [peekData, setPeekData] = useState<PeekResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // If already logged in, redirect to portal
  useEffect(() => {
    if (existingGuest) {
      navigate('/guest', { replace: true });
    }
  }, [existingGuest, navigate]);

  // Peek at token on mount to get guest info
  useEffect(() => {
    if (!token) {
      setErrorMessage('No login token provided.');
      setPageState('error');
      return;
    }

    peekToken();
  }, [token]);

  // Countdown timer for token expiry
  useEffect(() => {
    if (!peekData?.expires_at || pageState !== 'confirm') return;

    const expiresAt = new Date(peekData.expires_at);
    
    const updateRemaining = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        setErrorMessage('This login link has expired. Please ask staff to generate a new one.');
        setPageState('error');
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [peekData?.expires_at, pageState]);

  const peekToken = async () => {
    if (!token) return;

    try {
      const { data, error } = await supabase.rpc('peek_guest_login_token', {
        p_raw_token: token,
      });

      if (error) {
        console.error('Token peek error:', error);
        setErrorMessage('Failed to verify login link. Please try again.');
        setPageState('error');
        return;
      }

      const result = data as unknown as PeekResult;

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          'TOKEN_INVALID': 'This login link is invalid or has already been used.',
          'TOKEN_EXPIRED': 'This login link has expired. Please ask staff to generate a new one.',
          'TOKEN_ALREADY_USED': 'This login link has already been used. Each link can only be used once.',
        };
        setErrorMessage(errorMessages[result.error || ''] || 'Login failed. Please try again.');
        setPageState('error');
        return;
      }

      setPeekData(result);
      setPageState('confirm');
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setPageState('error');
    }
  };

  const handleConfirmLogin = async () => {
    if (!token) return;

    setPageState('processing');

    try {
      const { data, error } = await supabase.rpc('consume_guest_login_token', {
        p_raw_token: token,
      });

      if (error) {
        console.error('Token consumption error:', error);
        setErrorMessage('Failed to process login. Please try again.');
        setPageState('error');
        return;
      }

      const result = data as unknown as TokenValidationResult;

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          'TOKEN_INVALID': 'This login link is invalid or has already been used.',
          'TOKEN_EXPIRED': 'This login link has expired. Please ask staff to generate a new one.',
          'TOKEN_ALREADY_USED': 'This login link has already been used. Each link can only be used once.',
          'GUEST_NOT_FOUND': 'Guest information could not be found.',
        };
        setErrorMessage(errorMessages[result.error || ''] || 'Login failed. Please try again.');
        setPageState('error');
        return;
      }

      // Build session using centralized utility
      if (result.guest && result.resort) {
        // Register a session for this device
        let sessionId: string | undefined;
        let sessionToken: string | undefined;
        try {
          const deviceInfo = await getDeviceInfo();
          const { data: sessionData } = await supabase.rpc('register_guest_session', {
            p_guest_id: result.guest.id,
            p_resort_id: result.resort.id,
            p_device_fingerprint: deviceInfo.fingerprint,
            p_device_name: deviceInfo.deviceName,
            p_device_type: deviceInfo.deviceType,
            p_browser_name: deviceInfo.browserName,
            p_os_name: deviceInfo.osName,
          });
          const sessionResult = sessionData as unknown as { success: boolean; session_id?: string; session_token?: string };
          if (sessionResult.success) {
            sessionId = sessionResult.session_id;
            sessionToken = sessionResult.session_token;
          }
        } catch {
          // Session registration is optional
        }

        // Use centralized session builder for consistency
        const session = buildGuestSession({
          guest: result.guest,
          resort: result.resort,
          sessionId,
          sessionToken,
        });

        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));

        toast({
          title: 'Welcome!',
          description: `Logged in as ${result.guest.full_name}`,
        });

        window.location.href = '/guest';
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setPageState('error');
    }
  };

  const handleGoBack = () => {
    navigate('/guest/find', { replace: true });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpiringSoon = timeRemaining <= 30 && timeRemaining > 0;

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Validating login link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Login Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoBack} className="w-full">
              Go to Login Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state
  if (pageState === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Logging you in...</p>
        </div>
      </div>
    );
  }

  // Confirm state with personalized welcome
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Resort logo if available */}
          {peekData?.resort?.logo_url ? (
            <div className="mb-4">
              <img 
                src={peekData.resort.logo_url} 
                alt={peekData.resort.name || 'Resort'} 
                className="h-16 mx-auto object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          )}
          <CardTitle className="text-xl">
            {peekData?.guest?.full_name 
              ? `Welcome, ${peekData.guest.full_name}!` 
              : 'Confirm Your Login'
            }
          </CardTitle>
          <CardDescription>
            {peekData?.resort?.name && (
              <span className="block text-sm font-medium text-foreground mb-1">
                {peekData.resort.name}
              </span>
            )}
            A staff member has generated a login link for you. Tap the button below to confirm and access your guest portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Guest info preview */}
          {peekData?.guest && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{peekData.guest.full_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Room {peekData.guest.room_number}</span>
              </div>
            </div>
          )}

          {/* Timer display */}
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
            isExpiringSoon 
              ? 'bg-destructive/10 border border-destructive/30' 
              : 'bg-muted'
          }`}>
            <Clock className={`h-4 w-4 ${isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}`}>
              Link expires in {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Security notice */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Security Notice</p>
                <p>Only confirm if you requested this login or if a staff member is helping you. This link can only be used once.</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirmLogin} 
              className="w-full h-12 text-lg"
              size="lg"
            >
              <DoorOpen className="h-5 w-5 mr-2" />
              Confirm & Login
            </Button>
            <Button 
              onClick={handleGoBack} 
              variant="outline" 
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-muted-foreground">
            Having trouble? Ask a staff member for assistance or use the regular login with your room number and PIN.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}