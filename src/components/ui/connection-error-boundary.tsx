import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WifiOff, RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface ConnectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isConnectionError: boolean;
}

interface ConnectionErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export class ConnectionErrorBoundary extends React.Component<
  ConnectionErrorBoundaryProps,
  ConnectionErrorBoundaryState
> {
  constructor(props: ConnectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isConnectionError: false };
  }

  static getDerivedStateFromError(error: Error): ConnectionErrorBoundaryState {
    // Check if this is a connection-related error
    const isConnectionError = 
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('ERR_TUNNEL') ||
      error.message.includes('ERR_CONNECTION') ||
      error.message.includes('net::') ||
      error.message.includes('Load failed') ||
      error.message.includes('Network request failed');

    return { 
      hasError: true, 
      error,
      isConnectionError 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ConnectionErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, isConnectionError: false });
    this.props.onReset?.();
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { isConnectionError, error } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                {isConnectionError ? (
                  <WifiOff className="h-8 w-8 text-destructive" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <CardTitle className="text-xl">
                {isConnectionError ? 'Connection Lost' : 'Something went wrong'}
              </CardTitle>
              <CardDescription className="mt-2">
                {isConnectionError 
                  ? "We're having trouble connecting to the server. This could be due to a network issue or temporary server maintenance."
                  : 'An unexpected error occurred. Please try again.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && !isConnectionError && (
                <div className="p-3 bg-muted rounded-lg text-sm font-mono text-muted-foreground overflow-auto max-h-24 mb-4">
                  {error.message}
                </div>
              )}
              
              {isConnectionError && (
                <div className="text-sm text-muted-foreground text-center mb-4">
                  <p>Things to try:</p>
                  <ul className="list-disc list-inside mt-2 text-left">
                    <li>Check your internet connection</li>
                    <li>Wait a moment and try again</li>
                    <li>Refresh the page</li>
                  </ul>
                </div>
              )}

              <Button onClick={this.handleRetry} className="w-full" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button onClick={this.handleRefresh} className="w-full" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              
              <Button onClick={this.handleGoHome} className="w-full" variant="ghost">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
