import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface RouteErrorFallbackProps {
  error?: Error;
  onReset?: () => void;
}

export function RouteErrorFallback({ error, onReset }: RouteErrorFallbackProps) {
  const navigate = useNavigate();

  const handleRetry = () => {
    onReset?.();
    window.location.reload();
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          This page encountered an error. You can try again or navigate elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="p-3 bg-muted rounded-lg text-sm font-mono text-muted-foreground overflow-auto max-h-24 mb-4">
            {error.message}
          </div>
        )}
        
        <Button onClick={handleRetry} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload Page
        </Button>
        
        <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        
        <Button variant="ghost" onClick={() => navigate('/staff/dashboard')} className="w-full">
          <Home className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
