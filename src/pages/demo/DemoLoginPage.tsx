import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Legacy demo magic-link landing page.
 * The Perfect Demo Resort no longer uses email tokens — visitors enter via
 * `/book-demo`. We just redirect any incoming legacy links there.
 */
export default function DemoLoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/book-demo', { replace: true }), 600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Redirecting to demo…</p>
      </div>
    </div>
  );
}
