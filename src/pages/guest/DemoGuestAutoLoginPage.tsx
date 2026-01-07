import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Mail, Loader2, CheckCircle2 } from 'lucide-react';

const GUEST_SESSION_KEY = 'propera_guest_session';

export default function DemoGuestAutoLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isRequestingLink, setIsRequestingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    setToken(urlToken);
    
    if (!urlToken) {
      setError('No login token provided');
      setIsLoading(false);
      return;
    }

    async function autoLogin() {
      try {
        // Validate and consume the token
        const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
          body: {
            mode: 'consume-guest-token',
            token: urlToken,
          }
        });

        // Parse the actual error from the edge function response
        if (fnError) {
          let errorMessage = 'Failed to log in. The link may have expired.';
          let expired = false;
          try {
            if (fnError.context?.body) {
              const body = JSON.parse(fnError.context.body);
              if (body.error) errorMessage = body.error;
              if (body.expired || body.can_request_fresh_link) expired = true;
            }
          } catch {
            // Fallback to generic message
          }
          setIsExpired(expired);
          throw new Error(errorMessage);
        }

        if (!data?.success) {
          if (data?.expired || data?.can_request_fresh_link) {
            setIsExpired(true);
          }
          throw new Error(data?.error || 'Invalid or expired token');
        }

        // Store guest session directly
        const session = {
          guestId: data.guest_id,
          fullName: data.full_name,
          roomNumber: data.room_number,
          checkInDate: data.check_in_date,
          checkOutDate: data.check_out_date,
          resortId: data.resort_id,
          resortName: data.resort_name,
        };
        
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));

        // Redirect to guest home (will trigger context re-read)
        window.location.href = '/guest';
      } catch (err: any) {
        console.error('Auto-login failed:', err);
        setError(err.message || 'Failed to log in. The link may have expired.');
        setIsLoading(false);
      }
    }

    autoLogin();
  }, [searchParams, navigate]);

  const handleRequestFreshLink = async () => {
    if (!token || isRequestingLink) return;
    
    setIsRequestingLink(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
        body: {
          mode: 'request-fresh-link',
          token,
          token_type: 'guest',
        }
      });

      if (fnError) {
        let errorMessage = 'Failed to send fresh link';
        try {
          if (fnError.context?.body) {
            const body = JSON.parse(fnError.context.body);
            if (body.error) errorMessage = body.error;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      if (data?.success && data?.email_sent) {
        setLinkSent(true);
        setEmailSentTo(data.email_sent_to);
      } else if (data?.redirect_to_form) {
        navigate('/book-demo');
      } else {
        throw new Error(data?.error || 'Failed to send fresh link');
      }
    } catch (err: any) {
      console.error('Request fresh link failed:', err);
      setError(err.message);
    } finally {
      setIsRequestingLink(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Opening guest portal...</p>
      </div>
    );
  }

  if (linkSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Fresh Link Sent!</h1>
          <p className="text-muted-foreground mb-6">
            Check your email{emailSentTo ? ` at ${emailSentTo}` : ''} for a new login link.
          </p>
          <Button 
            variant="outline"
            className="w-full rounded-full"
            onClick={() => navigate('/guest')}
          >
            Go to Guest Login
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isExpired ? 'Link Expired' : 'Demo Link Issue'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <div className="space-y-3">
            {isExpired && token && (
              <Button 
                className="w-full rounded-full"
                onClick={handleRequestFreshLink}
                disabled={isRequestingLink}
              >
                {isRequestingLink ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Email Me a Fresh Link
              </Button>
            )}
            <Button 
              variant={isExpired ? "outline" : "default"}
              className="w-full rounded-full"
              onClick={() => navigate('/book-demo')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isExpired ? 'Start New Demo' : 'Generate New Demo Link'}
            </Button>
            <Button 
              variant="outline"
              className="w-full rounded-full"
              onClick={() => navigate('/guest')}
            >
              Guest Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
