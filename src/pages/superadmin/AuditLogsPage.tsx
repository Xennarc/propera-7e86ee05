import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { 
  Search, FileText, Building2, User, Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  resort_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  actor_name?: string;
  resort_name?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  update_resort_plan: { label: 'Plan Update', color: 'bg-primary/10 text-primary border-primary/20' },
  toggle_feature_flag: { label: 'Feature Toggle', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  remove_staff_access: { label: 'Staff Removed', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  create_resort: { label: 'Resort Created', color: 'bg-success/10 text-success border-success/20' },
  deactivate_resort: { label: 'Resort Deactivated', color: 'bg-muted text-muted-foreground border-border' },
};

export default function AuditLogsPage() {
  const { resorts } = useResort();
  const [searchQuery, setSearchQuery] = useState('');
  const [resortFilter, setResortFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Fetch audit logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', resortFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (resortFilter !== 'all') {
        query = query.eq('resort_id', resortFilter);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      // Fetch actor profiles
      const actorIds = [...new Set((logs || []).map(l => l.actor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds);

      // Enrich logs with names
      return (logs || []).map(log => ({
        ...log,
        actor_name: profiles?.find(p => p.id === log.actor_id)?.full_name || 'Unknown',
        resort_name: log.resort_id 
          ? resorts.find(r => r.id === log.resort_id)?.name || 'Unknown Resort'
          : null,
      })) as AuditLog[];
    },
  });

  // Filter logs by search
  const filteredLogs = auditLogs?.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.actor_name?.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.resort_name?.toLowerCase().includes(query)
    );
  }) || [];

  const getActionInfo = (action: string) => {
    return ACTION_LABELS[action] || { label: action, color: 'bg-muted text-muted-foreground border-border' };
  };

  const formatMetadata = (metadata: Record<string, unknown>) => {
    const entries = Object.entries(metadata);
    if (entries.length === 0) return '—';
    return entries
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Track all super admin actions across the platform"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={resortFilter} onValueChange={setResortFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Resorts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resorts</SelectItem>
            {resorts.map(resort => (
              <SelectItem key={resort.id} value={resort.id}>
                {resort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Actions
          </CardTitle>
          <CardDescription>
            Last 100 admin actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resort</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const actionInfo = getActionInfo(log.action);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.actor_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.resort_name ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {log.resort_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {formatMetadata(log.metadata_json as Record<string, unknown>)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={FileText}
              title="No audit logs"
              description="Admin actions will appear here as they occur"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
