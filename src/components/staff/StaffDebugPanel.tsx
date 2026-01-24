import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getErrors, clearErrors, initErrorCapture } from '@/lib/debug-error-capture';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bug, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Building2, 
  Shield, 
  Database, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  X,
  Map
} from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function DebugSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 hover:bg-muted/50 rounded transition-colors text-sm font-medium">
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        <span>{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-2">
        <div className="pl-5 border-l border-border/50 space-y-1 text-xs">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DebugRow({ label, value, status }: { label: string; value: React.ReactNode; status?: 'ok' | 'warn' | 'error' }) {
  const statusColors = {
    ok: 'text-green-500',
    warn: 'text-amber-500',
    error: 'text-red-500',
  };
  
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${status ? statusColors[status] : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function truncateUUID(uuid: string | undefined): string {
  if (!uuid) return 'N/A';
  return `${uuid.slice(0, 8)}...`;
}

export function StaffDebugPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [errors, setErrors] = useState(getErrors());
  const [renderTime] = useState(() => new Date());
  
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const { user, profile, globalRole, memberships, loading: authLoading, userDataLoading } = useAuth();
  const { currentResort, resorts, loading: resortLoading } = useResort();
  const { 
    currentResortRole, 
    permissionsLoading, 
    permissions,
    canAccessGuests,
    canManageResortStaff 
  } = usePermissions();

  // Initialize error capture
  useEffect(() => {
    const cleanup = initErrorCapture();
    return cleanup;
  }, []);

  // Refresh errors periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setErrors(getErrors());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Get query cache stats
  const queryCache = queryClient.getQueryCache();
  const allQueries = queryCache.getAll();
  const errorQueries = allQueries.filter(q => q.state.status === 'error');
  const staleQueries = allQueries.filter(q => q.isStale());

  const handleInvalidateAll = () => {
    queryClient.invalidateQueries();
  };

  const handleClearErrors = () => {
    clearErrors();
    setErrors([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center hover:bg-amber-500/30 transition-colors"
      >
        <Bug className="h-5 w-5 text-amber-500" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] bg-background/95 backdrop-blur border border-amber-500/50 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/30">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-sm">Staff Debug Console</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[calc(80vh-48px)]">
        <div className="p-2 space-y-1">
          {/* Auth Context */}
          <DebugSection 
            title="Auth Context" 
            icon={<User className="h-3.5 w-3.5 text-blue-500" />}
            defaultOpen={true}
          >
            <DebugRow 
              label="user.id" 
              value={truncateUUID(user?.id)} 
              status={user?.id ? 'ok' : 'error'}
            />
            <DebugRow 
              label="email" 
              value={user?.email || 'N/A'} 
            />
            <DebugRow 
              label="profile.name" 
              value={profile?.full_name || 'N/A'} 
              status={profile ? 'ok' : 'warn'}
            />
            <DebugRow 
              label="globalRole" 
              value={
                <Badge variant={globalRole === 'SUPER_ADMIN' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                  {globalRole}
                </Badge>
              } 
            />
            <DebugRow 
              label="memberships" 
              value={memberships.length} 
              status={memberships.length > 0 ? 'ok' : 'warn'}
            />
            <DebugRow 
              label="authLoading" 
              value={authLoading ? 'true' : 'false'} 
              status={authLoading ? 'warn' : 'ok'}
            />
            <DebugRow 
              label="userDataLoading" 
              value={userDataLoading ? 'true' : 'false'} 
              status={userDataLoading ? 'warn' : 'ok'}
            />
          </DebugSection>

          {/* Resort Context */}
          <DebugSection 
            title="Resort Context" 
            icon={<Building2 className="h-3.5 w-3.5 text-green-500" />}
            defaultOpen={true}
          >
            <DebugRow 
              label="resort.id" 
              value={truncateUUID(currentResort?.id)} 
              status={currentResort?.id ? 'ok' : 'error'}
            />
            <DebugRow 
              label="name" 
              value={currentResort?.name || 'N/A'} 
            />
            <DebugRow 
              label="code" 
              value={currentResort?.code || 'N/A'} 
            />
            <DebugRow 
              label="timezone" 
              value={currentResort?.timezone || 'N/A'} 
            />
            <DebugRow 
              label="accessible" 
              value={resorts.length} 
            />
            <DebugRow 
              label="resortLoading" 
              value={resortLoading ? 'true' : 'false'} 
              status={resortLoading ? 'warn' : 'ok'}
            />
          </DebugSection>

          {/* Permissions */}
          <DebugSection 
            title="Permissions" 
            icon={<Shield className="h-3.5 w-3.5 text-purple-500" />}
          >
            <DebugRow 
              label="resortRole" 
              value={
                currentResortRole ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {currentResortRole}
                  </Badge>
                ) : 'N/A'
              } 
              status={currentResortRole ? 'ok' : 'warn'}
            />
            <DebugRow 
              label="permissionsLoading" 
              value={permissionsLoading ? 'true' : 'false'} 
              status={permissionsLoading ? 'warn' : 'ok'}
            />
            <DebugRow 
              label="resolved count" 
              value={permissions.length} 
            />
            <DebugRow 
              label="guestsAccess" 
              value={canAccessGuests} 
              status={canAccessGuests !== 'none' ? 'ok' : 'warn'}
            />
            <DebugRow 
              label="canManageStaff" 
              value={canManageResortStaff ? 'true' : 'false'} 
            />
          </DebugSection>

          {/* Query Cache */}
          <DebugSection 
            title="Query Cache" 
            icon={<Database className="h-3.5 w-3.5 text-cyan-500" />}
          >
            <DebugRow 
              label="total queries" 
              value={allQueries.length} 
            />
            <DebugRow 
              label="with errors" 
              value={errorQueries.length} 
              status={errorQueries.length > 0 ? 'error' : 'ok'}
            />
            <DebugRow 
              label="stale" 
              value={staleQueries.length} 
              status={staleQueries.length > 5 ? 'warn' : 'ok'}
            />
            <div className="pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-7 text-xs"
                onClick={handleInvalidateAll}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Invalidate All
              </Button>
            </div>
          </DebugSection>

          {/* Error Log */}
          <DebugSection 
            title={`Error Log (${errors.length})`} 
            icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          >
            {errors.length === 0 ? (
              <p className="text-muted-foreground py-2">No errors captured</p>
            ) : (
              <>
                {errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] px-1 py-0 ${
                          err.type === 'network' ? 'border-cyan-500/50 text-cyan-500' :
                          err.type === 'unhandled' ? 'border-red-500/50 text-red-500' :
                          'border-amber-500/50 text-amber-500'
                        }`}
                      >
                        {err.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {err.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono mt-1 text-foreground/90 line-clamp-2">
                      {err.message}
                    </p>
                  </div>
                ))}
                <div className="pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full h-7 text-xs"
                    onClick={handleClearErrors}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear Errors
                  </Button>
                </div>
              </>
            )}
          </DebugSection>

          {/* Page Diagnostics */}
          <DebugSection 
            title="Page Diagnostics" 
            icon={<Map className="h-3.5 w-3.5 text-orange-500" />}
          >
            <DebugRow 
              label="route" 
              value={<span className="text-[10px]">{location.pathname}</span>} 
            />
            <DebugRow 
              label="search" 
              value={<span className="text-[10px]">{location.search || '(none)'}</span>} 
            />
            <DebugRow 
              label="rendered" 
              value={renderTime.toLocaleTimeString()} 
            />
          </DebugSection>
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-border/50 bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Remove <code className="bg-muted px-1 rounded">?debug=1</code> to hide
        </p>
      </div>
    </div>
  );
}
