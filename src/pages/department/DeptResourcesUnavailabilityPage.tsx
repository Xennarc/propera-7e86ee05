/**
 * DeptResourcesUnavailabilityPage – Mark assets as unavailable (maintenance).
 * Manager-gated CRUD. Regular staff see read-only.
 */
import { useState, useMemo } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, AlertTriangle, Plus, Trash2, Loader2, Wrench } from 'lucide-react';

function Content() {
  const { currentDepartment, isManager } = useDepartment();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resortId = currentDepartment?.resort_id;

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formAssetId, setFormAssetId] = useState('');
  const [formFullDay, setFormFullDay] = useState(true);
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('17:00');
  const [formReason, setFormReason] = useState('');

  // Assets
  const { data: assets = [] } = useQuery({
    queryKey: ['dept-unavail-assets', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      const { data } = await supabase
        .from('ops_assets')
        .select('id, name, type')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('name');
      return (data ?? []) as { id: string; name: string; type: string }[];
    },
    enabled: !!resortId,
    staleTime: 60_000,
  });

  // Unavailability entries for selected date
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dept-unavailability', resortId, selectedDate],
    queryFn: async () => {
      if (!resortId) return [];
      const { data } = await supabase
        .from('asset_unavailability')
        .select('*')
        .eq('resort_id', resortId)
        .eq('unavailable_date', selectedDate)
        .order('created_at');
      return data ?? [];
    },
    enabled: !!resortId,
    staleTime: 30_000,
  });

  const entriesWithNames = useMemo(() => {
    const nameMap = new Map(assets.map(a => [a.id, a.name]));
    return entries.map(e => ({ ...e, asset_name: nameMap.get(e.asset_id) ?? 'Unknown' }));
  }, [entries, assets]);

  const handleCreate = async () => {
    if (!formAssetId || !resortId) return;
    setSaving(true);
    const { error } = await supabase.from('asset_unavailability').insert({
      resort_id: resortId,
      asset_id: formAssetId,
      unavailable_date: selectedDate,
      start_time: formFullDay ? null : formStart,
      end_time: formFullDay ? null : formEnd,
      reason: formReason || null,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Unavailability recorded' });
      setDialogOpen(false);
      setFormReason('');
      queryClient.invalidateQueries({ queryKey: ['dept-unavailability'] });
      queryClient.invalidateQueries({ queryKey: ['dept-asset-unavailability'] });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('asset_unavailability').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['dept-unavailability'] });
      queryClient.invalidateQueries({ queryKey: ['dept-asset-unavailability'] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Asset Unavailability</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentDepartment?.name}</p>
        </div>
        {isManager && (
          <Button size="sm" onClick={() => { setFormAssetId(''); setFormFullDay(true); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="h-8 w-auto text-xs"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>
          Today
        </Button>
      </div>

      {/* Entries list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : entriesWithNames.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Wrench className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No unavailability entries for this date.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entriesWithNames.map(e => (
            <Card key={e.id} className="border-warning/30">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.asset_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.start_time && e.end_time
                      ? `${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}`
                      : 'All day'}
                    {e.reason ? ` · ${e.reason}` : ''}
                  </p>
                </div>
                {isManager && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Unavailable — {format(parseISO(selectedDate), 'EEE, MMM d')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={formAssetId} onValueChange={setFormAssetId}>
                <SelectTrigger><SelectValue placeholder="Select asset..." /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Full Day</Label>
              <Switch checked={formFullDay} onCheckedChange={setFormFullDay} />
            </div>
            {!formFullDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={formReason}
                onChange={e => setFormReason(e.target.value)}
                placeholder="e.g. Engine maintenance"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!formAssetId || saving} onClick={handleCreate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DeptResourcesUnavailabilityPage() {
  return (
    <DepartmentGuard moduleKey="resources_unavailability">
      <Content />
    </DepartmentGuard>
  );
}
