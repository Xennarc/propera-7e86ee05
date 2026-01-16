import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Loader2, Eye, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, addDays, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Calculate next scheduled run (every 4 days at 6:00 UTC)
function getNextScheduledRun(lastRunDate?: Date): Date {
  const now = new Date();
  // If we have a last run, next is 4 days from that
  if (lastRunDate) {
    const next = addDays(lastRunDate, 4);
    next.setUTCHours(6, 0, 0, 0);
    if (next > now) return next;
  }
  // Otherwise, calculate based on current date
  const next = new Date(now);
  next.setUTCHours(6, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  // Find next multiple of 4 days
  const dayOfMonth = next.getDate();
  const daysUntilNext = (4 - (dayOfMonth % 4)) % 4;
  next.setDate(next.getDate() + daysUntilNext);
  return next;
}

interface ResetLog {
  id: string;
  ran_at: string;
  action: string;
  status: string;
  deleted_counts_json: Record<string, number> | null;
  freshness_updates_json: Record<string, number> | null;
  availability_updates_json: Record<string, number> | null;
  seeded_bookings_json: Record<string, number> | null;
  duration_ms: number | null;
  error_message: string | null;
}

export function DemoResetButton() {
  const [showLogs, setShowLogs] = useState(false);

  // Fetch recent reset logs
  const { data: recentLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['demo-reset-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_reset_logs')
        .select('*')
        .order('ran_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as ResetLog[];
    },
  });

  const lastRun = recentLogs?.[0];

  // Dry run mutation
  const dryRunMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('demo-reset', {
        body: { action: 'dry_run' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.info('Dry Run Complete', {
        description: `Would delete: ${data.results?.deleted?.activity_bookings || 0} bookings, ${data.results?.deleted?.restaurant_reservations || 0} reservations`,
      });
    },
    onError: (error: Error) => {
      toast.error('Dry run failed', { description: error.message });
    },
  });

  // Full reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('demo-reset', {
        body: { action: 'run' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Demo Reset Complete', {
        description: `Cleaned ${data.results?.deleted?.activity_bookings || 0} bookings, refreshed ${data.results?.freshness?.guests_updated || 0} guests`,
      });
      refetchLogs();
    },
    onError: (error: Error) => {
      toast.error('Reset failed', { description: error.message });
      refetchLogs();
    },
  });

  const isRunning = dryRunMutation.isPending || resetMutation.isPending;

  const nextScheduled = getNextScheduledRun(lastRun ? new Date(lastRun.ran_at) : undefined);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Demo Reset
            </CardTitle>
            <CardDescription>
              Auto-resets every 4 days • Cleans demo data, refreshes guests
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {lastRun && (
              <Badge 
                variant={lastRun.status === 'success' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {lastRun.status === 'success' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {formatDistanceToNow(new Date(lastRun.ran_at), { addSuffix: true })}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Next: {format(nextScheduled, 'MMM d, HH:mm')} UTC
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dryRunMutation.mutate()}
            disabled={isRunning}
          >
            {dryRunMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            Dry Run
          </Button>
          <Button
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={isRunning}
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Reset Now
          </Button>
          <Dialog open={showLogs} onOpenChange={setShowLogs}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Clock className="h-4 w-4 mr-1" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Demo Reset History</DialogTitle>
                <DialogDescription>
                  Recent demo reset operations and their results
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {recentLogs?.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-3 text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : log.status === 'started' ? (
                            <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium capitalize">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.status}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(log.ran_at), { addSuffix: true })}
                          {log.duration_ms && ` • ${log.duration_ms}ms`}
                        </span>
                      </div>
                      {log.status === 'success' && (
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {log.deleted_counts_json && (
                            <div>
                              <strong>Deleted:</strong>{' '}
                              {log.deleted_counts_json.activity_bookings || 0} bookings,{' '}
                              {log.deleted_counts_json.restaurant_reservations || 0} reservations
                            </div>
                          )}
                          {log.freshness_updates_json && (
                            <div>
                              <strong>Refreshed:</strong>{' '}
                              {log.freshness_updates_json.guests_updated || 0} guests
                            </div>
                          )}
                          {log.availability_updates_json && (
                            <div>
                              <strong>Created:</strong>{' '}
                              {log.availability_updates_json.sessions_created || 0} sessions,{' '}
                              {log.availability_updates_json.slots_created || 0} slots
                            </div>
                          )}
                          {log.seeded_bookings_json && (
                            <div>
                              <strong>Seeded:</strong>{' '}
                              {log.seeded_bookings_json.activity_bookings || 0} bookings,{' '}
                              {log.seeded_bookings_json.restaurant_reservations || 0} reservations
                            </div>
                          )}
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-xs text-destructive">
                          Error: {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                  {!recentLogs?.length && (
                    <p className="text-center text-muted-foreground py-4">
                      No reset logs yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">
          Cleans demo_user bookings, refreshes guest dates, ensures 14-day inventory
        </p>
      </CardContent>
    </Card>
  );
}
