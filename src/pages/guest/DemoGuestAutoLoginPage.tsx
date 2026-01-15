import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Legacy guest demo auto-login page.
 * Now redirects to the unified /demo/login route.
 */
export default function DemoGuestAutoLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Redirect to unified demo login with the token
      navigate(`/demo/login?token=${encodeURIComponent(token)}`, { replace: true });
    } else {
      // No token, redirect to book demo
      navigate('/book-demo', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Redirecting...</p>
    </div>
  );
}
