import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGuestAuth, buildGuestSession, GUEST_SESSION_KEY } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, AlertCircle, KeyRound, RefreshCw, Laptop } from 'lucide-react';
import { getDeviceInfo } from '@/lib/device-info';

type PageState = 'loading' | 'processing' | 'desktop' | 'error' | 'no_token';

interface TokenResult {
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
    logo_url: string | null;
    timezone: string;
  };
  stay_id?: string;
  error?: string;
}

interface SessionRegistrationResult {
  success: boolean;
  session_id?: string;
  session_token?: string;
  error?: string;
}

// Detect if user is on desktop
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    const isSmallScreen = window.innerWidth < 768;
    setIsDesktop(!isMobile && !isSmallScreen);
  }, []);

  return isDesktop;
}

export default function GuestAccessLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { guest } = useGuestAuth();
  const { toast } = useToast();
  const isDesktop = useIsDesktop();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const token = searchParams.get('t');

  // If already logged in, redirect to guest home
  useEffect(() => {
    if (guest) {
      navigate('/guest', { replace: true });
    }
  }, [guest, navigate]);

  // Process token on mount
  useEffect(() => {
    if (guest) return; // Already redirecting

    if (!token) {
      setPageState('no_token');
      return;
    }

    // On desktop, show QR code instead of processing
    if (isDesktop) {
      setPageState('desktop');
      return;
    }

    // Process token on mobile
    processToken();
  }, [token, isDesktop, guest]);

  const processToken = async () => {
    if (!token) return;

    setPageState('processing');

    try {
      // Consume the access link token
      const { data, error } = await supabase.rpc('consume_guest_access_link', {
        p_raw_token: token,
      });

      if (error) {
        console.error('Token consumption error:', error);
        setErrorMessage('Unable to verify your access link. Please try again or contact reception.');
        setPageState('error');
        return;
      }

      const result = data as unknown as TokenResult;

      if (!result.success || !result.guest || !result.resort) {
        const errorMap: Record<string, string> = {
          TOKEN_NOT_FOUND: 'This access link is invalid or has already been used.',
          TOKEN_ALREADY_USED: 'This access link has already been used. Please request a new one.',
          TOKEN_EXPIRED: 'This access link has expired. Please request a new one.',
          GUEST_NOT_FOUND: 'Guest record not found. Please contact reception.',
        };

        setErrorMessage(errorMap[result.error || ''] || 'Unable to verify your access link.');
        setPageState('error');
        return;
      }

      // Register device session
      const deviceInfo = await getDeviceInfo();
      let sessionId: string | undefined;
      let sessionToken: string | undefined;

      try {
        const { data: sessionData, error: sessionError } = await supabase.rpc('register_guest_session', {
          p_guest_id: result.guest.id,
          p_resort_id: result.resort.id,
          p_device_fingerprint: deviceInfo.fingerprint,
          p_device_name: deviceInfo.deviceName,
          p_device_type: deviceInfo.deviceType,
          p_browser_name: deviceInfo.browserName,
          p_os_name: deviceInfo.osName,
        });

        if (!sessionError && sessionData) {
          const sessionResult = sessionData as unknown as SessionRegistrationResult;
          if (sessionResult.success) {
            sessionId = sessionResult.session_id;
            sessionToken = sessionResult.session_token;
          }
        }
      } catch (err) {
        console.error('Session registration error:', err);
        // Continue without session - guest can still use the portal
      }

      // Use centralized session builder for consistency
      const guestSession = buildGuestSession({
        guest: result.guest,
        resort: result.resort,
        sessionId,
        sessionToken,
        stayId: result.stay_id,
      });

      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));

      toast({
        title: 'Welcome!',
        description: `Signed in as ${result.guest.full_name}`,
      });

      // Force reload to pick up new session in context
      window.location.href = '/guest';
    } catch (err) {
      console.error('Token processing error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setPageState('error');
    }
  };

  const handleRetry = () => {
    processToken();
  };

  const handleGoToLogin = () => {
    navigate('/guest/find', { replace: true });
  };

  const handleContinueOnDesktop = () => {
    // Force processing even on desktop
    processToken();
  };

  // Construct the full URL for QR code
  const getQrUrl = () => {
    const origin = window.location.origin;
    return `${origin}/guest/access?t=${token}`;
  };

  // No token provided
  if (pageState === 'no_token') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mx-auto">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Invalid Link</h1>
            <p className="text-muted-foreground">
              This access link is missing required information.
            </p>
            <Button onClick={handleGoToLogin} className="w-full">
              <KeyRound className="h-4 w-4 mr-2" />
              Sign in with Room Number & PIN
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Processing token
  if (pageState === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-lg font-medium">Signing you in...</p>
          <p className="text-muted-foreground text-sm">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Desktop - show QR for mobile scanning with bypass option
  if (pageState === 'desktop') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">Scan with Your Phone</h1>
              <p className="text-muted-foreground text-sm">
                For the best experience, scan this QR code with your phone's camera
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg inline-block mx-auto">
              <QRCodeSVG
                value={getQrUrl()}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <p>The guest portal is optimized for mobile devices</p>
            </div>

            {/* Desktop bypass option */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                On a laptop but want to continue?
              </p>
              <Button 
                onClick={handleContinueOnDesktop} 
                variant="ghost" 
                size="sm" 
                className="w-full"
              >
                <Laptop className="h-4 w-4 mr-2" />
                Continue on this device
              </Button>
            </div>

            <div className="pt-2 border-t">
              <Button variant="ghost" onClick={handleGoToLogin} className="w-full">
                <KeyRound className="h-4 w-4 mr-2" />
                Or sign in with Room Number & PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Access Link Error</h1>
          <p className="text-muted-foreground">
            {errorMessage}
          </p>
          <div className="space-y-2 pt-2">
            <Button onClick={handleRetry} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoToLogin} className="w-full">
              <KeyRound className="h-4 w-4 mr-2" />
              Sign in with Room Number & PIN
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            If this problem persists, please ask reception for a new access link
          </p>
        </CardContent>
      </Card>
    </div>
  );
}