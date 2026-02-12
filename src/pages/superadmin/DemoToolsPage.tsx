import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function DemoToolsPage() {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [seedVersion, setSeedVersion] = useState('v1');

  // Fetch demo resort info
  const { data: demoResort } = useQuery({
    queryKey: ['demo-resort-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, code, is_demo, demo_instance_id, demo_last_reset_at, demo_seed_version')
        .eq('code', 'DEMO')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent reset runs
  const { data: resetRuns } = useQuery({
    queryKey: ['demo-reset-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_reset_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });

  // Manual reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!demoResort?.id) throw new Error('Demo resort not found');
      const { data, error } = await supabase.rpc('reset_demo_resort', {
        p_resort_id: demoResort.id,
        p_seed_version: seedVersion,
        p_trigger: 'manual',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Demo reset complete! Instance: ${data?.demo_instance_id}`);
      queryClient.invalidateQueries({ queryKey: ['demo-resort-info'] });
      queryClient.invalidateQueries({ queryKey: ['demo-reset-runs'] });
      setConfirmText('');
    },
    onError: (err: any) => {
      toast.error(`Reset failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo Tools</h1>
        <p className="text-muted-foreground">Manage the shared demo environment</p>
      </div>

      {/* Current State */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demo Resort Status</CardTitle>
        </CardHeader>
        <CardContent>
          {demoResort ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Instance ID</p>
                <p className="text-2xl font-bold">{demoResort.demo_instance_id ?? 1}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seed Version</p>
                <p className="text-lg font-medium">{demoResort.demo_seed_version ?? 'v1'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Reset</p>
                <p className="text-sm font-medium">
                  {demoResort.demo_last_reset_at
                    ? formatDistanceToNow(new Date(demoResort.demo_last_reset_at), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resort ID</p>
                <p className="text-xs font-mono truncate">{demoResort.id}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No DEMO resort found</p>
          )}
        </CardContent>
      </Card>

      {/* Manual Reset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manual Reset</CardTitle>
          <CardDescription>
            Wipe transactional data and increment the instance ID. Active sessions will see a "demo refreshed" prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              value={seedVersion}
              onChange={e => setSeedVersion(e.target.value)}
              placeholder="Seed version"
              className="w-32"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!demoResort}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Demo Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Demo Environment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all transactional data (bookings, requests, buggy trips, notifications) for the demo resort. 
                    Type <strong>RESET</strong> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder='Type "RESET" to confirm'
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== 'RESET' || resetMutation.isPending}
                    onClick={() => resetMutation.mutate()}
                  >
                    {resetMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Reset History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reset History</CardTitle>
          <CardDescription>Last 20 demo reset runs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Instance</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resetRuns?.length ? resetRuns.map((run: any) => (
                <TableRow key={run.id}>
                  <TableCell className="text-xs">
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{run.trigger}</Badge>
                  </TableCell>
                  <TableCell>
                    {run.status === 'success' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Success
                      </Badge>
                    ) : run.status === 'failed' ? (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" /> Failed
                      </Badge>
                    ) : (
                      <Badge className="text-xs">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {run.demo_instance_before} → {run.demo_instance_after ?? '?'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {run.finished_at
                      ? `${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {run.error || (run.summary ? Object.entries(run.summary as Record<string, number>).map(([k, v]) => `${k}:${v}`).join(', ') : '—')}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No reset runs yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
