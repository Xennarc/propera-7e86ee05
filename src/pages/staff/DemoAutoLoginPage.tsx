import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DemoAutoLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('No login token provided');
      setIsLoading(false);
      return;
    }

    async function autoLogin() {
      try {
        // Validate and consume the token
        const { data, error: fnError } = await supabase.functions.invoke('provision-demo', {
          body: {
            mode: 'consume-staff-token',
            token,
          }
        });

        if (fnError) throw fnError;

        if (!data?.success) {
          throw new Error(data?.error || 'Invalid or expired token');
        }

        // Sign in with the returned credentials
        const { email, password } = data;
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        // Redirect to dashboard
        navigate('/staff/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Auto-login failed:', err);
        setError(err.message || 'Failed to log in. The link may have expired.');
        setIsLoading(false);
      }
    }

    autoLogin();
  }, [searchParams, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Signing you in...</p>
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Demo Link Expired</h1>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <Button 
              className="w-full rounded-full"
              onClick={() => navigate('/book-demo')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Demo Link
            </Button>
            <Button 
              variant="outline"
              className="w-full rounded-full"
              onClick={() => navigate('/staff/auth')}
            >
              Sign In Manually
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
