/**
 * DeptResourcesShiftsPage – Manage staff shifts for the department.
 * Manager-gated CRUD. Regular staff see read-only view.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2, Loader2 } from 'lucide-react';

function Content() {
  const { currentDepartment, isManager } = useDepartment();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resortId = currentDepartment?.resort_id;
  const deptKey = currentDepartment?.key;

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('17:00');

  // Fetch members
  const { data: members = [] } = useQuery({
    queryKey: ['dept-shift-members', resortId, deptKey],
    queryFn: async () => {
      if (!resortId || !deptKey) return [];
      const { data: mems } = await supabase
        .from('department_memberships')
        .select('user_id')
        .eq('resort_id', resortId)
        .eq('department_key', deptKey)
        .eq('is_active', true);
      if (!mems || mems.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', mems.map(m => m.user_id));
      return (profiles ?? []).map(p => ({ id: p.id, name: p.full_name ?? 'Unknown' }));
    },
    enabled: !!resortId && !!deptKey,
    staleTime: 60_000,
  });

  // Fetch shifts for selected date
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['dept-shifts', resortId, deptKey, selectedDate],
    queryFn: async () => {
      if (!resortId || !deptKey) return [];
      const { data } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('resort_id', resortId)
        .eq('department_key', deptKey)
        .eq('shift_date', selectedDate)
        .order('start_time');
      return data ?? [];
    },
    enabled: !!resortId && !!deptKey,
    staleTime: 30_000,
  });

  const shiftsWithNames = useMemo(() => {
    const nameMap = new Map(members.map(m => [m.id, m.name]));
    return shifts.map(s => ({ ...s, full_name: nameMap.get(s.user_id) ?? 'Unknown' }));
  }, [shifts, members]);

  const handleCreate = async () => {
    if (!formUserId || !resortId || !deptKey) return;
    setSaving(true);
    const { error } = await supabase.from('staff_shifts').insert({
      resort_id: resortId,
      department_key: deptKey,
      user_id: formUserId,
      shift_date: selectedDate,
      start_time: formStart,
      end_time: formEnd,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shift created' });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dept-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['dept-staff-shifts'] });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('staff_shifts').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['dept-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['dept-staff-shifts'] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Staff Shifts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentDepartment?.name}</p>
        </div>
        {isManager && (
          <Button size="sm" onClick={() => { setFormUserId(''); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Shift
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

      {/* Shifts list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : shiftsWithNames.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Clock className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No shifts scheduled for this date.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shiftsWithNames.map(s => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="text-sm font-mono font-medium text-primary w-24 shrink-0">
                  {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.full_name}</p>
                  {s.notes && <p className="text-xs text-muted-foreground truncate">{s.notes}</p>}
                </div>
                {isManager && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.id)}>
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
            <DialogTitle>Add Shift — {format(parseISO(selectedDate), 'EEE, MMM d')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!formUserId || saving} onClick={handleCreate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DeptResourcesShiftsPage() {
  return (
    <DepartmentGuard moduleKey="resources_shifts">
      <Content />
    </DepartmentGuard>
  );
}
