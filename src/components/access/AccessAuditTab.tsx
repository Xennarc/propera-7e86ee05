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
      <div className="space-y-2 pt-2 px-5 pb-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  const grantCount = auditLog.filter((l: any) => l.action_key === 'permission.override.grant' || l.action_key === 'role.assigned').length;
  const revokeCount = auditLog.filter((l: any) => l.action_key === 'permission.override.revoke' || l.action_key === 'role.removed').length;

  return (
    <ScrollArea className="h-full px-5 pb-6">
      {/* Summary header */}
      {lastChangedAt && (
        <div className="flex items-center gap-2 py-3 border-b border-border/40 mb-3">
          <History className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground">
            Last changed{' '}
            <span className="font-medium text-foreground">
              {formatDistanceToNow(new Date(lastChangedAt), { addSuffix: true })}
            </span>
            {lastChangedBy && (
              <> by <span className="font-medium text-foreground">{lastChangedBy}</span></>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {auditLog.length > 0 && (
        <div className="flex gap-4 mb-4">
          <StatChip label="Total" value={auditLog.length} />
          <StatChip label="Grants" value={grantCount} variant="success" />
          <StatChip label="Revoked" value={revokeCount} variant="destructive" />
        </div>
      )}

      {auditLog.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No changes recorded</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Changes will appear here as permissions are modified</p>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          {auditLog.map((log: any) => {
            const ActionIcon = ACTION_ICONS[log.action_key] || History;
            const variant = ACTION_VARIANTS[log.action_key] || 'secondary';
            const details = log.details_json || {};

            return (
              <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-border/30 hover:bg-muted/30 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  variant === 'success' ? 'bg-success/10 text-success' :
                  variant === 'destructive' ? 'bg-destructive/10 text-destructive' :
                  variant === 'warning' ? 'bg-warning/10 text-warning' :
                  variant === 'info' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <ActionIcon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {AUDIT_ACTION_LABELS[log.action_key] || log.action_key}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1.5">
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
                    <p className="text-[11px] text-muted-foreground mt-1">
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
