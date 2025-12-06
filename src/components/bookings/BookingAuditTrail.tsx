import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Clock, User, FileText, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

interface AuditLog {
  id: string;
  action: string;
  changed_by_user_id: string | null;
  changed_at: string;
  change_summary: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by_profile?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

interface BookingAuditTrailProps {
  bookingId: string;
  bookingType: 'ACTIVITY' | 'RESTAURANT';
}

const actionColors: Record<string, string> = {
  CREATED: 'bg-green-500/10 text-green-700 dark:text-green-400',
  UPDATED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-400',
  STATUS_CHANGED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export function BookingAuditTrail({ bookingId, bookingType }: BookingAuditTrailProps) {
  const { isSuperAdmin, currentResortRole } = usePermissions();
  
  // Only manager and above can see audit trail
  const canViewAuditTrail = isSuperAdmin || 
    currentResortRole === 'RESORT_ADMIN' || 
    currentResortRole === 'MANAGER';

  const { data: logs, isLoading } = useQuery({
    queryKey: ['booking-audit-logs', bookingType, bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_audit_logs')
        .select(`
          id,
          action,
          changed_by_user_id,
          changed_at,
          change_summary,
          old_values,
          new_values
        `)
        .eq('booking_type', bookingType)
        .eq('booking_id', bookingId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Fetch profile info for each unique user
      const userIds = [...new Set(data?.map(log => log.changed_by_user_id).filter(Boolean))] as string[];
      
      let profilesMap: Record<string, { full_name: string | null; username: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, username: p.username };
            return acc;
          }, {} as Record<string, { full_name: string | null; username: string | null }>);
        }
      }

      return data?.map(log => ({
        ...log,
        changed_by_profile: log.changed_by_user_id ? profilesMap[log.changed_by_user_id] : null
      })) as AuditLog[];
    },
    enabled: canViewAuditTrail,
  });

  if (!canViewAuditTrail) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Booking History
        </h3>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Booking History
        </h3>
        <p className="text-sm text-muted-foreground">No audit history available.</p>
      </div>
    );
  }

  const getChangedByName = (log: AuditLog) => {
    if (!log.changed_by_user_id) return 'System';
    if (log.changed_by_profile?.full_name) return log.changed_by_profile.full_name;
    if (log.changed_by_profile?.username) return log.changed_by_profile.username;
    return 'Unknown User';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Booking History
      </h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
          >
            <div className="flex-shrink-0 mt-0.5">
              {log.action === 'CANCELLED' ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={actionColors[log.action] || ''}>
                  {log.action}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(log.changed_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <p className="text-sm mt-1">{log.change_summary || 'Changes made'}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{getChangedByName(log)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
