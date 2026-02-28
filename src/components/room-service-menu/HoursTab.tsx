/**
 * Ordering Hours management tab.
 */

import { useState, useMemo } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Clock } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface HoursRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function RoomServiceHoursTab() {
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ day_of_week: '1', start_time: '07:00', end_time: '23:00' });

  const queryKey = ['rs-ordering-hours', resortId];

  const { data: hours = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_ordering_hours')
        .select('id, day_of_week, start_time, end_time, is_active')
        .eq('resort_id', resortId!)
        .order('day_of_week');
      if (error) throw error;
      return data as HoursRow[];
    },
    enabled: !!resortId,
  });

  const createMutation = useMutation({
    mutationFn: async (p: { day_of_week: number; start_time: string; end_time: string }) => {
      const { error } = await supabase
        .from('room_service_ordering_hours')
        .insert({ ...p, resort_id: resortId!, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
      toast({ title: 'Hours added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('room_service_ordering_hours')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('room_service_ordering_hours')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Hours removed' });
    },
  });

  // Days that already have hours configured
  const configuredDays = useMemo(
    () => new Set(hours.map(h => h.day_of_week)),
    [hours],
  );

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {hours.length === 0
              ? 'No hours configured — room service is always open'
              : `${hours.filter(h => h.is_active).length} active day(s)`}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Hours
        </Button>
      </div>

      {hours.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            No ordering hours configured. Room service is treated as always open.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {hours.map(h => (
            <Card key={h.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {DAY_NAMES[h.day_of_week]}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {h.start_time} — {h.end_time}
                  </span>
                </div>
                <Switch
                  checked={h.is_active}
                  onCheckedChange={val => toggleMutation.mutate({ id: h.id, is_active: val })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteMutation.mutate(h.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Ordering Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Day of week</Label>
              <Select value={form.day_of_week} onValueChange={v => setForm(f => ({ ...f, day_of_week: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, idx) => (
                    <SelectItem
                      key={idx}
                      value={String(idx)}
                      disabled={configuredDays.has(idx)}
                    >
                      {name} {configuredDays.has(idx) ? '(configured)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">End time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({
                day_of_week: parseInt(form.day_of_week),
                start_time: form.start_time,
                end_time: form.end_time,
              })}
              disabled={createMutation.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
