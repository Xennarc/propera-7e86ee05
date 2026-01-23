import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth, GuestSession } from '@/contexts/GuestAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, 
  XCircle, 
  RefreshCw, 
  Monitor,
  QrCode,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

type PageState = 'loading' | 'processing' | 'desktop' | 'error' | 'no_token';

// Detect if user is on desktop
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsDesktop(!isMobile && !isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isDesktop;
}

export default function GuestQrLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { guest: existingGuest } = useGuestAuth();
  const isDesktop = useIsDesktop();
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  
  const token = searchParams.get('t');
  
  // Build the full QR URL for desktop display
  const qrUrl = token ? `https://propera.cc/guest/qr?t=${token}` : '';

  // If already logged in, redirect to portal
  useEffect(() => {
    if (existingGuest) {
      navigate('/guest', { replace: true });
    }
  }, [existingGuest, navigate]);

  // Process token on mount
  useEffect(() => {
    if (!token) {
      setPageState('no_token');
      return;
    }

    // If on desktop, show QR instead of processing
    if (isDesktop) {
      setPageState('desktop');
      return;
    }

    // Process the token (instant login)
    processToken();
  }, [token, isDesktop]);

  const processToken = async () => {
    if (!token) return;

    setPageState('processing');

    try {
      const { data, error } = await supabase.rpc('consume_guest_login_token', {
        p_raw_token: token,
      });

      if (error) {
        console.error('Token consumption error:', error);
        setErrorMessage('Failed to process login. Please try again.');
        setErrorCode('SYSTEM_ERROR');
        setPageState('error');
        return;
      }

      const result = data as unknown as TokenValidationResult;

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          'TOKEN_INVALID': 'This QR code is invalid or has already been used.',
          'TOKEN_EXPIRED': 'This QR code has expired. Please ask staff to generate a new one.',
          'TOKEN_ALREADY_USED': 'This QR code has already been used. Each code can only be used once.',
          'GUEST_NOT_FOUND': 'Guest information could not be found.',
        };
        setErrorMessage(errorMessages[result.error || ''] || 'Login failed. Please try again.');
        setErrorCode(result.error || 'UNKNOWN');
        setPageState('error');
        return;
      }

      // Build session and store it
      if (result.guest && result.resort) {
        const session: GuestSession = {
          guestId: result.guest.id,
          fullName: result.guest.full_name,
          roomNumber: result.guest.room_number,
          checkInDate: result.guest.check_in_date,
          checkOutDate: result.guest.check_out_date,
          resortId: result.resort.id,
          resortName: result.resort.name,
          resortLogoUrl: result.resort.logo_url,
          resortTimezone: result.resort.timezone,
        };

        // Store session (same key as normal login)
        localStorage.setItem('propera_guest_session', JSON.stringify(session));

        toast({
          title: `Welcome, ${result.guest.full_name}!`,
          description: 'You are now logged in to the guest portal.',
        });

        // Reload to pick up the new session in GuestAuthContext
        window.location.href = '/guest';
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setErrorCode('SYSTEM_ERROR');
      setPageState('error');
    }
  };

  const handleRetry = () => {
    if (token) {
      processToken();
    }
  };

  const handleGoToLogin = () => {
    navigate('/guest/find', { replace: true });
  };

  const handleAskStaff = () => {
    // Could open a help dialog or navigate to help page
    toast({
      title: 'Need Help?',
      description: 'Please ask a staff member to generate a new QR code for you.',
    });
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Preparing login...</p>
        </div>
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

  // No token provided
  if (pageState === 'no_token') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>No QR Code Detected</CardTitle>
            <CardDescription>
              Please scan a valid QR code from a staff member to log in, or use the standard login with your room number and PIN.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleGoToLogin} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Desktop view - show QR for scanning on phone
  if (pageState === 'desktop') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Scan with Your Phone</CardTitle>
            <CardDescription>
              This login works best on your mobile device. Scan the QR code below with your phone's camera to log in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Desktop indicator */}
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Desktop detected
              </span>
            </div>

            {/* QR Code for scanning */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border">
              <QRCodeSVG
                value={qrUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">How to scan:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open your phone's camera app</li>
                <li>Point it at the QR code above</li>
                <li>Tap the notification that appears</li>
              </ol>
            </div>

            {/* Alternative login */}
            <div className="pt-2 border-t">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Or log in manually:
              </p>
              <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                Use Room Number & PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>QR Login Failed</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error-specific guidance */}
          {errorCode === 'TOKEN_EXPIRED' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">QR codes expire quickly</p>
                  <p>For security, QR codes are only valid for a few minutes. Please ask a staff member to generate a new one.</p>
                </div>
              </div>
            </div>
          )}

          {errorCode === 'TOKEN_ALREADY_USED' && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Each QR code can only be used once. If you need to log in again, please ask staff for a new code.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <Button onClick={handleAskStaff} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Ask Staff for New QR
            </Button>
            <Button onClick={handleGoToLogin} variant="outline" className="w-full">
              Use Room Number & PIN Instead
            </Button>
          </div>

          {/* Retry button for system errors */}
          {errorCode === 'SYSTEM_ERROR' && (
            <Button onClick={handleRetry} variant="ghost" className="w-full text-muted-foreground">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
