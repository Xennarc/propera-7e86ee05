import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  showStack: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
  /** If true, shows componentStack in dev mode for debugging */
  showDebugInfo?: boolean;
}

// Helper to extract the component name from componentStack
function extractComponentName(stack: string | undefined): string | null {
  if (!stack) return null;
  // Look for pattern like "at ComponentName" or "in ComponentName"
  const match = stack.match(/(?:at|in)\s+(\w+)/);
  return match ? match[1] : null;
}

// Helper to get top N lines of component stack
function getTopStackLines(stack: string | undefined, count: number = 5): string[] {
  if (!stack) return [];
  return stack.split('\n').filter(line => line.trim()).slice(0, count);
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, showStack: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store componentStack for display
    this.setState({ componentStack: errorInfo.componentStack || undefined });
    
    // Log detailed error info
    console.error('ErrorBoundary caught an error:', error.message);
    console.error('Component stack:', errorInfo.componentStack);
    
    // If it's a null .id crash, log additional debug info
    if (error.message.includes("reading 'id'") || error.message.includes("reading 'id'")) {
      console.error('[CRASH DEBUG] Null .id access detected:', {
        errorMessage: error.message,
        crashComponent: extractComponentName(errorInfo.componentStack || ''),
        topStack: getTopStackLines(errorInfo.componentStack || '', 5),
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, componentStack: undefined, showStack: false });
    this.props.onReset?.();
  };

  toggleStack = () => {
    this.setState(prev => ({ showStack: !prev.showStack }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const crashComponent = extractComponentName(this.state.componentStack);
      const topStackLines = getTopStackLines(this.state.componentStack, 5);
      const isDev = import.meta.env.DEV;
      const showDebug = isDev || this.props.showDebugInfo;

      return (
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              An error occurred while rendering this component.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error message */}
            {this.state.error && (
              <div className="p-3 bg-muted rounded-lg text-sm font-mono text-muted-foreground overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            {/* Debug info (dev mode or explicit) */}
            {showDebug && crashComponent && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                <p className="font-medium text-warning mb-1">
                  Crash in component: <code className="bg-warning/20 px-1 rounded">{crashComponent}</code>
                </p>
              </div>
            )}

            {/* Component stack toggle (dev mode) */}
            {showDebug && topStackLines.length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleStack}
                  className="w-full justify-between text-muted-foreground"
                >
                  <span>Component Stack ({topStackLines.length} frames)</span>
                  {this.state.showStack ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {this.state.showStack && (
                  <div className="p-3 bg-muted rounded-lg text-xs font-mono text-muted-foreground overflow-auto max-h-48">
                    {topStackLines.map((line, i) => (
                      <div key={i} className="py-0.5 border-b border-border/50 last:border-0">
                        {line.trim()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
