import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Mail, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DEMO_RESORT_CODE } from '@/lib/demoSingleton';

const GUEST_SESSION_KEY = 'propera_guest_session';
const DEMO_EMAIL_KEY = 'propera_demo_email';

export default function DemoLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isRequestingFreshLink, setIsRequestingFreshLink] = useState(false);
  const [freshLinkSent, setFreshLinkSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No login token provided');
      return;
    }

    consumeToken();
  }, [token]);

  const consumeToken = async () => {
    try {
      // First try to consume as staff token
      const { data: staffData, error: staffError } = await supabase.functions.invoke('provision-demo', {
        body: {
          token,
          mode: 'consume-staff-token',
        }
      });

      if (staffData?.success) {
        // Staff token - sign in with temporary password
        // Add small delay to ensure password update has propagated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: staffData.email,
          password: staffData.temp_password,
        });

        if (authError) {
          console.error('Staff sign-in failed:', authError);
          // Retry once after another short delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: staffData.email,
            password: staffData.temp_password,
          });
          
          if (retryError) {
            console.error('Staff sign-in retry failed:', retryError);
            setStatus('error');
            setError('Failed to sign in. Please try again.');
            return;
          }
        }

        setStatus('success');
        toast.success('Welcome to the demo!');
        
        // Redirect to staff dashboard
        setTimeout(() => {
          navigate('/staff/dashboard', { replace: true });
        }, 500);
        return;
      }

      // Check if it's an expired staff token
      if (staffError || staffData?.expired) {
        // Try as guest token
        const { data: guestData, error: guestError } = await supabase.functions.invoke('provision-demo', {
          body: {
            token,
            mode: 'consume-guest-token',
          }
        });

        if (guestData?.success) {
          // Guest token - store session in localStorage
          const session = {
            guestId: guestData.guest_id,
            fullName: guestData.full_name,
            roomNumber: guestData.room_number,
            checkInDate: guestData.check_in_date,
            checkOutDate: guestData.check_out_date,
            resortId: guestData.resort_id,
            resortName: guestData.resort_name,
            resortCode: guestData.resort_code || DEMO_RESORT_CODE,
          };
          
          localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
          
          setStatus('success');
          toast.success('Welcome to the guest portal!');
          
          // Redirect to resort-scoped guest portal
          const resortCode = guestData.resort_code || DEMO_RESORT_CODE;
          setTimeout(() => {
            window.location.href = `/resort/${resortCode}/guest`;
          }, 500);
          return;
        }

        // Check if it's an expired guest token
        if (guestData?.expired || staffData?.expired) {
          setStatus('expired');
          setError('This link has expired. Request a fresh one below.');
          return;
        }
      }

      // Token not found or invalid
      setStatus('error');
      setError('Invalid or expired link. Please request a new demo link.');
    } catch (err: any) {
      console.error('Token consumption error:', err);
      setStatus('error');
      setError(err.message || 'Failed to process login link');
    }
  };

  const handleRequestFreshLink = async () => {
    const savedEmail = localStorage.getItem(DEMO_EMAIL_KEY);
    
    if (!savedEmail) {
      // No saved email, redirect to book demo
      navigate('/book-demo');
      return;
    }

    setIsRequestingFreshLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: savedEmail,
          mode: 'start-demo-singleton',
        }
      });

      if (error) throw error;

      if (data?.success && data?.emailSent) {
        setFreshLinkSent(true);
        toast.success('Fresh links sent to your email!');
      } else if (data?.emailError) {
        toast.info(data.emailError);
      } else {
        throw new Error('Failed to send fresh links');
      }
    } catch (err: any) {
      console.error('Fresh link request failed:', err);
      toast.error(err.message || 'Failed to send fresh links');
    } finally {
      setIsRequestingFreshLink(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <LoadingSpinner size="lg" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome to Propera!</h2>
          <p className="text-muted-foreground">Redirecting you now...</p>
        </div>
      </div>
    );
  }

  if (freshLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Check your email!</h2>
          <p className="text-muted-foreground mb-6">
            We've sent fresh login links to your email.
          </p>
          <Button variant="outline" onClick={() => navigate('/book-demo')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Demo Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">
          {status === 'expired' ? 'Link Expired' : 'Something went wrong'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {error || 'The login link is invalid or has expired.'}
        </p>
        
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={handleRequestFreshLink}
            disabled={isRequestingFreshLink}
          >
            {isRequestingFreshLink ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Email Me Fresh Links
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/book-demo')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start a New Demo
          </Button>
        </div>
      </div>
    </div>
  );
}
