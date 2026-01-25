import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getErrors, 
  clearErrors, 
  type CapturedError 
} from '@/lib/debug-error-capture';
import {
  getPendingQueries,
  getRecentQueries,
  getQueryStats,
  formatDuration,
  getTimingColorClass,
  type TrackedQuery
} from '@/lib/debug-query-tracker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  Bug, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Minimize2, 
  Maximize2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  User,
  MapPin,
  Trash2,
  Copy
} from 'lucide-react';

function truncateId(id: string | undefined | null): string {
  if (!id) return 'null';
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon, badge, defaultOpen = false, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {icon}
          <span>{title}</span>
        </div>
        {badge}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function DataRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono", className)}>{value}</span>
    </div>
  );
}

export function StaffDebugConsole() {
  const { user, memberships, userDataLoading, globalRole } = useAuth();
  const { currentResort, resorts, loading: resortLoading } = useResort();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Live data refresh
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [pendingQueries, setPendingQueries] = useState<TrackedQuery[]>([]);
  const [recentQueries, setRecentQueries] = useState<TrackedQuery[]>([]);
  const [queryStats, setQueryStats] = useState({ avgDuration: 0, slowCount: 0, totalCount: 0 });
  const [renderCount, setRenderCount] = useState(0);
  
  useEffect(() => {
    setRenderCount(c => c + 1);
  }, [currentResort, resortLoading, userDataLoading]);
  
  useEffect(() => {
    const refresh = () => {
      setErrors(getErrors());
      setPendingQueries(getPendingQueries());
      setRecentQueries(getRecentQueries());
      setQueryStats(getQueryStats());
    };
    
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);
  
  const handleCopyError = (error: CapturedError) => {
    const text = `${error.message}\n\nStack:\n${error.stack || 'No stack trace'}`;
    navigator.clipboard.writeText(text);
  };
  
  if (!isVisible) return null;
  
  const errorCount = errors.length;
  const pendingCount = pendingQueries.length;
  
  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-background/95 backdrop-blur-sm shadow-lg gap-2"
        >
          <Bug className="h-4 w-4" />
          {errorCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {errorCount}
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
          <Maximize2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[min(90vw,420px)] max-h-[75vh] bg-background/95 backdrop-blur-sm border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Staff Debug Console</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {/* Auth & Resort State */}
          <Section
            title="Auth & Resort State"
            icon={<User className="h-3 w-3" />}
            defaultOpen={true}
            badge={
              currentResort ? (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  NULL
                </Badge>
              )
            }
          >
            <div className="space-y-1 pt-2">
              <DataRow label="User ID" value={truncateId(user?.id)} />
              <DataRow label="Global Role" value={globalRole} className={globalRole === 'SUPER_ADMIN' ? 'text-amber-500' : ''} />
              <DataRow label="Memberships" value={`${memberships.length} resort(s)`} />
              <DataRow 
                label="User Data Loading" 
                value={userDataLoading ? 'true' : 'false'} 
                className={userDataLoading ? 'text-amber-500' : 'text-green-500'}
              />
              <div className="border-t my-2" />
              <DataRow 
                label="Current Resort" 
                value={currentResort ? currentResort.name : 'null'} 
                className={currentResort ? 'text-green-500' : 'text-red-500 font-bold'}
              />
              <DataRow label="Resort ID" value={truncateId(currentResort?.id)} />
              <DataRow label="Resort Code" value={currentResort?.code || 'null'} />
              <DataRow 
                label="Resort Loading" 
                value={resortLoading ? 'true' : 'false'} 
                className={resortLoading ? 'text-amber-500' : 'text-green-500'}
              />
              <DataRow label="Available Resorts" value={resorts.length} />
              <DataRow label="Render Count" value={renderCount} className="text-muted-foreground" />
            </div>
          </Section>
          
          {/* React Query Diagnostics */}
          <Section
            title="React Query"
            icon={<Database className="h-3 w-3" />}
            badge={
              pendingCount > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1 animate-spin" />
                  {pendingCount} pending
                </Badge>
              ) : null
            }
          >
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-bold">{queryStats.totalCount}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-bold">{queryStats.avgDuration}ms</div>
                  <div className="text-muted-foreground">Avg</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className={cn("font-bold", queryStats.slowCount > 0 && "text-amber-500")}>
                    {queryStats.slowCount}
                  </div>
                  <div className="text-muted-foreground">Slow</div>
                </div>
              </div>
              
              {pendingQueries.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Pending:</div>
                  {pendingQueries.map((q, i) => (
                    <div key={i} className="text-xs font-mono flex justify-between items-center bg-amber-500/10 px-2 py-1 rounded">
                      <span className="truncate flex-1">{q.keyString}</span>
                      <span className={getTimingColorClass(q.duration || 0)}>
                        {formatDuration(q.duration || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {recentQueries.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Recent:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs px-1"
                      onClick={() => {
                        import('@/lib/debug-query-tracker').then(m => m.clearQueryHistory());
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {recentQueries.slice(0, 5).map((q, i) => (
                    <div key={i} className="text-xs font-mono flex justify-between items-center px-2 py-1 rounded bg-muted/30">
                      <div className="flex items-center gap-1 truncate flex-1">
                        {q.status === 'success' ? (
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                        )}
                        <span className="truncate">{q.keyString}</span>
                      </div>
                      <span className={cn("ml-2 shrink-0", getTimingColorClass(q.duration || 0))}>
                        {formatDuration(q.duration || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
          
          {/* Error Log */}
          <Section
            title="Error Log"
            icon={<AlertTriangle className="h-3 w-3" />}
            badge={
              errorCount > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} error(s)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600">
                  No errors
                </Badge>
              )
            }
          >
            <div className="space-y-2 pt-2">
              {errors.length > 0 ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7"
                    onClick={clearErrors}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                  {errors.map((error, i) => (
                    <div key={i} className="text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {error.timestamp.toLocaleTimeString()}
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              {error.type}
                            </Badge>
                          </div>
                          <div className="font-medium text-red-600 break-words">
                            {error.message}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopyError(error)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {error.stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Stack trace
                          </summary>
                          <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No errors captured yet
                </div>
              )}
            </div>
          </Section>
          
          {/* Page Diagnostics */}
          <Section
            title="Page Diagnostics"
            icon={<MapPin className="h-3 w-3" />}
          >
            <div className="space-y-1 pt-2">
              <DataRow label="Current Route" value={location.pathname} />
              <DataRow label="Search Params" value={location.search || '(none)'} />
              <DataRow 
                label="Query Cache Size" 
                value={queryClient.getQueryCache().getAll().length} 
              />
            </div>
          </Section>
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground text-center">
        Add <code className="bg-muted px-1 rounded">?debug=1</code> to any staff URL
      </div>
    </div>
  );
}
