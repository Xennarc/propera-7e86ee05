import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ArrowUpRight, ArrowDownRight, RefreshCw, UserPlus, UserMinus, Key, Shield } from 'lucide-react';
import { AUDIT_ACTION_LABELS } from '@/types/rbac';

const ACTION_ICONS: Record<string, typeof History> = {
  'role.assigned': Shield,
  'role.removed': Shield,
  'permission.override.grant': ArrowUpRight,
  'permission.override.revoke': ArrowDownRight,
  'permission.override.removed': RefreshCw,
  'user.invited': UserPlus,
  'user.removed': UserMinus,
  'user.password_reset': Key,
};

const ACTION_VARIANTS: Record<string, 'success' | 'destructive' | 'warning' | 'secondary' | 'info'> = {
  'role.assigned': 'success',
  'role.removed': 'destructive',
  'permission.override.grant': 'info',
  'permission.override.revoke': 'warning',
  'permission.override.removed': 'secondary',
  'user.invited': 'success',
  'user.removed': 'destructive',
  'user.password_reset': 'warning',
};

interface AccessAuditTabProps {
  auditLog: any[];
  isLoading: boolean;
  lastChangedAt?: string | null;
  lastChangedBy?: string | null;
}

export function AccessAuditTab({ auditLog, isLoading, lastChangedAt, lastChangedBy }: AccessAuditTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 pt-2 px-6 pb-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full px-6 pb-6">
      {/* Summary header */}
      {lastChangedAt && (
        <div className="flex items-center gap-2 py-3 border-b border-border/40 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <span>Last changed </span>
            <span className="font-medium text-foreground">
              {formatDistanceToNow(new Date(lastChangedAt), { addSuffix: true })}
            </span>
            {lastChangedBy && (
              <span> by <span className="font-medium text-foreground">{lastChangedBy}</span></span>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {auditLog.length > 0 && (
        <div className="flex gap-3 mb-3">
          <StatChip
            label="Total changes"
            value={auditLog.length}
          />
          <StatChip
            label="Grants"
            value={auditLog.filter((l: any) => l.action_key === 'permission.override.grant' || l.action_key === 'role.assigned').length}
            variant="success"
          />
          <StatChip
            label="Revocations"
            value={auditLog.filter((l: any) => l.action_key === 'permission.override.revoke' || l.action_key === 'role.removed').length}
            variant="destructive"
          />
        </div>
      )}

      {auditLog.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No access changes recorded yet</p>
          <p className="text-xs mt-1">Changes will appear here as permissions are modified</p>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          {auditLog.map((log: any) => {
            const ActionIcon = ACTION_ICONS[log.action_key] || History;
            const variant = ACTION_VARIANTS[log.action_key] || 'secondary';
            const details = log.details_json || {};

            return (
              <div key={log.id} className="flex gap-3 p-2.5 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  variant === 'success' ? 'bg-success/10 text-success' :
                  variant === 'destructive' ? 'bg-destructive/10 text-destructive' :
                  variant === 'warning' ? 'bg-warning/10 text-warning' :
                  variant === 'info' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <ActionIcon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {AUDIT_ACTION_LABELS[log.action_key] || log.action_key}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {details.role_name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {details.role_name}
                      </Badge>
                    )}
                    {details.permission_key && (
                      <Badge variant="subtle" className="text-[10px] px-1.5 py-0 font-mono">
                        {details.permission_key}
                      </Badge>
                    )}
                  </div>

                  {log.actor && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      by {log.actor.full_name || log.actor.username || 'System'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}

function StatChip({ label, value, variant }: { label: string; value: number; variant?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold tabular-nums ${
        variant === 'success' ? 'text-success' :
        variant === 'destructive' ? 'text-destructive' :
        'text-foreground'
      }`}>{value}</span>
    </div>
  );
}
