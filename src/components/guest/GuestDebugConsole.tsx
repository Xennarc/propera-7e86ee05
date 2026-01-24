import { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  Bug, 
  X, 
  Minimize2, 
  Maximize2, 
  ChevronDown, 
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Trash2,
  Database,
  User,
  HardDrive,
  Activity,
  MapPin
} from 'lucide-react';
import { 
  getPendingQueries, 
  getRecentQueries, 
  getQueryStats,
  formatDuration,
  getTimingColorClass,
  clearQueryHistory,
  type TrackedQuery
} from '@/lib/debug-query-tracker';
import { getErrors, clearErrors, type CapturedError } from '@/lib/debug-error-capture';

const STORAGE_KEY = 'propera_guest_session';

// Section component for collapsible debug sections
function DebugSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  badge,
  badgeVariant = 'default'
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  badgeVariant?: 'default' | 'warning' | 'error';
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-2 hover:bg-muted/50 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{title}</span>
        </div>
        {badge !== undefined && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
            badgeVariant === 'error' && "bg-destructive/20 text-destructive",
            badgeVariant === 'warning' && "bg-amber-500/20 text-amber-600",
            badgeVariant === 'default' && "bg-muted text-muted-foreground"
          )}>
            {badge}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-7 pr-2 pb-2 space-y-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Debug row for key-value display
function DebugRow({ 
  label, 
  value, 
  status,
  mono = false 
}: { 
  label: string; 
  value: React.ReactNode; 
  status?: 'ok' | 'warn' | 'error';
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-[11px] py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        "text-right break-all",
        mono && "font-mono",
        status === 'ok' && "text-green-600",
        status === 'warn' && "text-amber-600",
        status === 'error' && "text-destructive"
      )}>
        {value}
      </span>
    </div>
  );
}

// Query row component
function QueryRow({ query }: { query: TrackedQuery }) {
  const duration = query.duration ?? 0;
  return (
    <div className="flex items-center gap-2 text-[10px] py-1 border-b border-border/30 last:border-0">
      {query.status === 'pending' ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : query.status === 'success' ? (
        <CheckCircle className="h-3 w-3 text-green-500" />
      ) : (
        <AlertCircle className="h-3 w-3 text-destructive" />
      )}
      <span className="flex-1 truncate font-mono">{query.keyString}</span>
      <span className={cn("font-mono shrink-0", getTimingColorClass(duration))}>
        {formatDuration(duration)}
      </span>
      {query.isSlow && <span className="text-[9px] text-amber-500">SLOW</span>}
    </div>
  );
}

// Error row component
function ErrorRow({ error, onCopy }: { error: CapturedError; onCopy: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-destructive/20 rounded-lg p-2 bg-destructive/5">
      <div className="flex items-start justify-between gap-2">
        <div 
          className="flex-1 cursor-pointer" 
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              {error.timestamp.toLocaleTimeString()}
            </span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-destructive/20 text-destructive">
              {error.type}
            </span>
          </div>
          <p className={cn(
            "text-[11px] text-destructive mt-1",
            !expanded && "line-clamp-2"
          )}>
            {error.message}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 shrink-0"
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      {expanded && error.stack && (
        <pre className="text-[9px] text-muted-foreground mt-2 p-2 bg-muted/50 rounded overflow-x-auto max-h-32">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

// LocalStorage validation
function validateLocalStorageSession(): { 
  raw: string | null; 
  valid: boolean; 
  parsed: Record<string, unknown> | null;
  issues: string[];
} {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { raw: null, valid: false, parsed: null, issues: ['No session in localStorage'] };
  }
  
  try {
    const parsed = JSON.parse(raw);
    const issues: string[] = [];
    
    // Check for non-string values that could cause React error #300
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== undefined && typeof value !== 'string') {
        issues.push(`${key}: expected string, got ${typeof value}`);
      }
    }
    
    return { raw, valid: issues.length === 0, parsed, issues };
  } catch {
    return { raw, valid: false, parsed: null, issues: ['Failed to parse JSON'] };
  }
}

export function GuestDebugConsole() {
  const { guest, logout } = useGuestAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [renderTime] = useState(() => new Date());
  
  // Live data refresh
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [pendingQueries, setPendingQueries] = useState<TrackedQuery[]>([]);
  const [recentQueries, setRecentQueries] = useState<TrackedQuery[]>([]);
  const [queryStats, setQueryStats] = useState({ avgDuration: 0, slowCount: 0, totalCount: 0 });
  const [localStorageData, setLocalStorageData] = useState(() => validateLocalStorageSession());
  
  // Refresh debug data periodically
  useEffect(() => {
    const refresh = () => {
      setErrors(getErrors());
      setPendingQueries(getPendingQueries());
      setRecentQueries(getRecentQueries());
      setQueryStats(getQueryStats());
      setLocalStorageData(validateLocalStorageSession());
    };
    
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);
  
  const handleCopyError = useCallback((error: CapturedError) => {
    const text = `${error.type}: ${error.message}\n\nStack:\n${error.stack || 'No stack trace'}`;
    navigator.clipboard.writeText(text);
  }, []);
  
  const handleClearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocalStorageData(validateLocalStorageSession());
    logout();
  }, [logout]);
  
  const handleClearErrors = useCallback(() => {
    clearErrors();
    setErrors([]);
  }, []);
  
  const handleClearQueries = useCallback(() => {
    clearQueryHistory();
    setRecentQueries([]);
    setQueryStats({ avgDuration: 0, slowCount: 0, totalCount: 0 });
  }, []);
  
  const truncateId = (id: string | undefined) => {
    if (!id) return 'N/A';
    return id.length > 12 ? `${id.slice(0, 8)}...` : id;
  };
  
  if (!isVisible) return null;
  
  // Minimized view
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-[calc(var(--guest-nav-h)+8px)] right-2 z-[9999] flex items-center gap-2 px-3 py-2 rounded-full bg-background/95 border border-border shadow-lg backdrop-blur-sm cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <Bug className="h-4 w-4 text-primary" />
        {errors.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-medium">
            {errors.length}
          </span>
        )}
        {pendingQueries.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-medium">
            {pendingQueries.length}
          </span>
        )}
        <Maximize2 className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-[calc(var(--guest-nav-h)+8px)] right-2 z-[9999] w-[min(90vw,380px)] max-h-[70vh] flex flex-col rounded-xl bg-background/95 border border-border shadow-2xl backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Guest Debug Console</span>
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
        <div className="p-2 space-y-1">
          {/* Active Queries */}
          <DebugSection 
            title="Active Queries" 
            icon={Loader2}
            badge={pendingQueries.length}
            badgeVariant={pendingQueries.length > 0 ? 'warning' : 'default'}
            defaultOpen={pendingQueries.length > 0}
          >
            {pendingQueries.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">No active queries</p>
            ) : (
              pendingQueries.map((q, i) => <QueryRow key={i} query={q} />)
            )}
          </DebugSection>
          
          {/* Query Performance */}
          <DebugSection 
            title="Query Performance" 
            icon={Activity}
            badge={queryStats.slowCount > 0 ? `${queryStats.slowCount} slow` : undefined}
            badgeVariant="warning"
          >
            <DebugRow label="Avg Duration" value={`${queryStats.avgDuration}ms`} />
            <DebugRow label="Total Queries" value={queryStats.totalCount} />
            <DebugRow 
              label="Slow Queries" 
              value={queryStats.slowCount} 
              status={queryStats.slowCount > 0 ? 'warn' : 'ok'}
            />
            {recentQueries.length > 0 && (
              <>
                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-[10px] text-muted-foreground">Recent:</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-[10px] px-1.5"
                    onClick={handleClearQueries}
                  >
                    <Trash2 className="h-2.5 w-2.5 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="max-h-24 overflow-y-auto">
                  {recentQueries.slice(0, 10).map((q, i) => (
                    <QueryRow key={i} query={q} />
                  ))}
                </div>
              </>
            )}
          </DebugSection>
          
          {/* Guest Session */}
          <DebugSection title="Guest Session" icon={User} defaultOpen>
            {guest ? (
              <>
                <DebugRow label="Guest ID" value={truncateId(guest.guestId)} mono />
                <DebugRow label="Full Name" value={guest.fullName || 'N/A'} />
                <DebugRow label="Room" value={guest.roomNumber || 'N/A'} />
                <DebugRow label="Resort ID" value={truncateId(guest.resortId)} mono />
                <DebugRow label="Resort Name" value={guest.resortName || 'N/A'} />
                <DebugRow label="Timezone" value={guest.resortTimezone || 'N/A'} />
                <DebugRow label="Check-in" value={guest.checkInDate || 'N/A'} />
                <DebugRow label="Check-out" value={guest.checkOutDate || 'N/A'} />
                <DebugRow label="Session ID" value={truncateId(guest.sessionId)} mono />
                <DebugRow 
                  label="Session Token" 
                  value={guest.sessionToken ? `${guest.sessionToken.slice(0, 8)}****` : 'N/A'} 
                  mono 
                />
              </>
            ) : (
              <p className="text-[10px] text-destructive">No guest session</p>
            )}
          </DebugSection>
          
          {/* LocalStorage Inspection */}
          <DebugSection 
            title="LocalStorage" 
            icon={HardDrive}
            badge={localStorageData.issues.length > 0 ? localStorageData.issues.length : undefined}
            badgeVariant="error"
          >
            <DebugRow 
              label="Status" 
              value={localStorageData.valid ? 'Valid' : 'Issues Found'} 
              status={localStorageData.valid ? 'ok' : 'error'}
            />
            {localStorageData.issues.map((issue, i) => (
              <p key={i} className="text-[10px] text-destructive">• {issue}</p>
            ))}
            {localStorageData.raw && (
              <details className="mt-1">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                  Raw JSON ({localStorageData.raw.length} chars)
                </summary>
                <pre className="text-[9px] mt-1 p-2 bg-muted/50 rounded overflow-x-auto max-h-24">
                  {localStorageData.raw}
                </pre>
              </details>
            )}
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full h-6 text-[10px] mt-2"
              onClick={handleClearSession}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Session & Logout
            </Button>
          </DebugSection>
          
          {/* Error Log */}
          <DebugSection 
            title="Error Log" 
            icon={AlertCircle}
            badge={errors.length > 0 ? errors.length : undefined}
            badgeVariant="error"
            defaultOpen={errors.length > 0}
          >
            {errors.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">No errors captured</p>
            ) : (
              <>
                <div className="flex justify-end mb-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-[10px] px-1.5"
                    onClick={handleClearErrors}
                  >
                    <Trash2 className="h-2.5 w-2.5 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="space-y-2">
                  {errors.slice(0, 5).map((error, i) => (
                    <ErrorRow 
                      key={i} 
                      error={error} 
                      onCopy={() => handleCopyError(error)} 
                    />
                  ))}
                </div>
              </>
            )}
          </DebugSection>
          
          {/* Page Diagnostics */}
          <DebugSection title="Page Diagnostics" icon={MapPin}>
            <DebugRow label="Route" value={location.pathname} mono />
            <DebugRow label="Search" value={location.search || '(none)'} mono />
            <DebugRow label="Rendered" value={renderTime.toLocaleTimeString()} />
            <DebugRow label="Query Count" value={queryClient.getQueryCache().getAll().length} />
          </DebugSection>
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/20">
        <p className="text-[9px] text-muted-foreground text-center">
          Remove <code className="bg-muted px-1 rounded">?debug=1</code> to hide
        </p>
      </div>
    </div>
  );
}
