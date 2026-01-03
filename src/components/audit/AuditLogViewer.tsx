/**
 * Audit Log Viewer Component
 * 
 * Displays audit trail for entities or the whole resort.
 * Used in admin dashboards and entity detail pages.
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useAuditLogs,
  useEntityAuditHistory,
  getAuditActionLabel,
  getAuditEntityLabel,
  type AuditLogRecord,
} from '@/hooks/useAuditLog';
import { useResortTimezone } from '@/hooks/useResortTimezone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History,
  ChevronDown,
  User,
  Clock,
  Eye,
} from 'lucide-react';

interface AuditLogViewerProps {
  /** Show logs for a specific entity */
  entity?: string;
  /** Show logs for a specific entity ID */
  entityId?: string;
  /** Title to display */
  title?: string;
  /** Maximum height for the scroll area */
  maxHeight?: string;
  /** Show entity filter dropdown */
  showEntityFilter?: boolean;
  /** Number of records to display */
  limit?: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  UPDATED: 'bg-blue-500/10 text-blue-700 border-blue-200',
  CANCELLED: 'bg-amber-500/10 text-amber-700 border-amber-200',
  DELETED: 'bg-red-500/10 text-red-700 border-red-200',
  COMPLETED: 'bg-purple-500/10 text-purple-700 border-purple-200',
  REVIEWED: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
  CHANGED: 'bg-sky-500/10 text-sky-700 border-sky-200',
  ASSIGNED: 'bg-teal-500/10 text-teal-700 border-teal-200',
  REMOVED: 'bg-rose-500/10 text-rose-700 border-rose-200',
  RESET: 'bg-orange-500/10 text-orange-700 border-orange-200',
  STARTED: 'bg-violet-500/10 text-violet-700 border-violet-200',
  ENDED: 'bg-slate-500/10 text-slate-700 border-slate-200',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color;
  }
  return 'bg-muted text-muted-foreground border-border';
}

function AuditLogEntry({ log }: { log: AuditLogRecord }) {
  const { formatDateTime } = useResortTimezone();
  const [isOpen, setIsOpen] = useState(false);
  
  const actorName = log.actor?.full_name || log.actor?.username || 'System';
  const isViewAs = !!log.effective_user_id && log.effective_user_id !== log.actor_user_id;
  const effectiveUserName = log.effective_user?.full_name || log.effective_user?.username;
  
  const hasDetails = log.before || log.after || (log.metadata && Object.keys(log.metadata).length > 0);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-border py-3 last:border-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={getActionColor(log.action)}>
                {getAuditActionLabel(log.action)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {getAuditEntityLabel(log.entity)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1.5 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{actorName}</span>
              {isViewAs && effectiveUserName && (
                <>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                  <span className="text-muted-foreground">as {effectiveUserName}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDateTime(log.created_at)}
            </div>
          </div>
          
          {hasDetails && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        
        <CollapsibleContent>
          {hasDetails && (
            <div className="mt-3 p-3 bg-muted/50 rounded-md text-xs space-y-2">
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Details:</span>
                  <pre className="mt-1 text-foreground whitespace-pre-wrap">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {log.before && (
                <div>
                  <span className="font-medium text-muted-foreground">Before:</span>
                  <pre className="mt-1 text-foreground whitespace-pre-wrap max-h-32 overflow-auto">
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div>
                  <span className="font-medium text-muted-foreground">After:</span>
                  <pre className="mt-1 text-foreground whitespace-pre-wrap max-h-32 overflow-auto">
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AuditLogViewer({
  entity,
  entityId,
  title = 'Audit Trail',
  maxHeight = '400px',
  showEntityFilter = false,
  limit = 50,
}: AuditLogViewerProps) {
  const [selectedEntity, setSelectedEntity] = useState<string | undefined>(entity);
  
  const { data: logs, isLoading, error } = useAuditLogs({
    entity: selectedEntity,
    entityId,
    limit,
  });
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load audit logs</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              {logs?.length || 0} events
            </CardDescription>
          </div>
          
          {showEntityFilter && (
            <Select value={selectedEntity || 'all'} onValueChange={(v) => setSelectedEntity(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="activity_bookings">Activity Bookings</SelectItem>
                <SelectItem value="restaurant_reservations">Reservations</SelectItem>
                <SelectItem value="activity_sessions">Sessions</SelectItem>
                <SelectItem value="guests">Guests</SelectItem>
                <SelectItem value="resort_memberships">Staff</SelectItem>
                <SelectItem value="prearrival_profiles">Pre-arrival</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }}>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div>
              {logs.map((log) => (
                <AuditLogEntry key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit history available
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Compact audit trail for entity detail pages
 */
export function EntityAuditTrail({
  entity,
  entityId,
  title = 'History',
}: {
  entity: string;
  entityId: string | undefined;
  title?: string;
}) {
  const { data: logs, isLoading } = useEntityAuditHistory(entity, entityId);
  const { formatDateTime } = useResortTimezone();
  
  if (!entityId) return null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[200px]">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-border pl-3 py-1">
                  <div className="font-medium">{getAuditActionLabel(log.action)}</div>
                  <div className="text-muted-foreground">
                    {log.actor?.full_name || 'System'} • {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No history</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
