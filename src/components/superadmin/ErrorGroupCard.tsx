import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CopyButton } from '@/components/demo/CopyButton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Building2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import type { PlatformError } from '@/hooks/usePlatformErrors';

interface ErrorGroup {
  key: string;
  message: string;
  count: number;
  severity: 'warning' | 'error' | 'critical';
  route: string;
  errors: PlatformError[];
  latestError: PlatformError;
  affectedResorts: Set<string>;
}

interface ErrorGroupCardProps {
  group: ErrorGroup;
  onResolve?: (errorId: string) => void;
  isResolving?: boolean;
}

export function ErrorGroupCard({ group, onResolve, isResolving }: ErrorGroupCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<PlatformError | null>(null);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          badge: 'bg-destructive/15 text-destructive border-destructive/30',
          card: 'border-l-4 border-l-destructive bg-destructive/5',
          icon: AlertTriangle,
        };
      case 'error':
        return {
          badge: 'bg-warning/15 text-warning border-warning/30',
          card: 'border-l-4 border-l-warning bg-warning/5',
          icon: AlertCircle,
        };
      default:
        return {
          badge: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
          card: 'border-l-4 border-l-yellow-500',
          icon: AlertCircle,
        };
    }
  };

  const styles = getSeverityStyles(group.severity);
  const SeverityIcon = styles.icon;

  return (
    <Card className={cn('overflow-hidden transition-all', styles.card)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3">
              {/* Expand/Collapse Icon */}
              <div className="mt-0.5">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className={cn('text-[10px]', styles.badge)}>
                    <SeverityIcon className="h-3 w-3 mr-1" />
                    {group.severity}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono bg-muted/50">
                    {group.count}×
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    {group.route}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{group.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last: {format(new Date(group.latestError.created_at), 'MMM d, HH:mm')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {group.affectedResorts.size} resort(s)
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve?.(group.latestError.id);
                  }}
                  disabled={isResolving}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50 bg-muted/10 p-4 space-y-4">
            {/* Occurrences List */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Occurrences ({group.errors.length})
              </h4>
              <ScrollArea className="h-[120px]">
                <div className="space-y-1">
                  {group.errors.map((error) => (
                    <button
                      key={error.id}
                      onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                      className={cn(
                        'w-full text-left p-2 rounded-lg text-xs transition-colors',
                        'hover:bg-muted/30',
                        selectedError?.id === error.id && 'bg-muted/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-muted-foreground">
                          {format(new Date(error.created_at), 'MMM d, HH:mm:ss')}
                        </span>
                        {error.resort_name && (
                          <Badge variant="outline" className="text-[9px]">
                            {error.resort_name}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Stack Trace */}
            {selectedError?.error_stack && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Stack Trace
                  </h4>
                  <CopyButton 
                    value={selectedError.error_stack} 
                    label="Trace copied!" 
                    variant="outline"
                    size="sm"
                    className="h-6 w-6"
                  />
                </div>
                <div className="relative">
                  <pre className={cn(
                    'p-3 rounded-lg overflow-x-auto text-[11px] leading-relaxed',
                    'bg-[#1e1e1e] text-[#d4d4d4] font-mono',
                    'border border-border/30'
                  )}>
                    <code>{selectedError.error_stack}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Metadata */}
            {selectedError?.metadata_json && Object.keys(selectedError.metadata_json).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Metadata
                  </h4>
                  <CopyButton 
                    value={JSON.stringify(selectedError.metadata_json, null, 2)} 
                    label="Metadata copied!" 
                    variant="outline"
                    size="sm"
                    className="h-6 w-6"
                  />
                </div>
                <pre className={cn(
                  'p-3 rounded-lg overflow-x-auto text-[11px] leading-relaxed',
                  'bg-muted/30 font-mono border border-border/30'
                )}>
                  <code>{JSON.stringify(selectedError.metadata_json, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Helper function to group errors by message
export function groupErrors(errors: PlatformError[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();

  for (const error of errors) {
    // Create a key based on route + normalized message
    const normalizedMessage = error.error_message
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
      .replace(/\d+/g, '[N]');
    
    const key = `${error.route}::${normalizedMessage}`;

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.count++;
      group.errors.push(error);
      if (error.resort_name) {
        group.affectedResorts.add(error.resort_name);
      }
      // Update latest if newer
      if (new Date(error.created_at) > new Date(group.latestError.created_at)) {
        group.latestError = error;
      }
    } else {
      groups.set(key, {
        key,
        message: error.error_message,
        count: 1,
        severity: error.severity,
        route: error.route,
        errors: [error],
        latestError: error,
        affectedResorts: error.resort_name ? new Set([error.resort_name]) : new Set(),
      });
    }
  }

  // Sort by count (most frequent first), then by latest occurrence
  return Array.from(groups.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.latestError.created_at).getTime() - new Date(a.latestError.created_at).getTime();
    });
}
