/**
 * SessionAssignDrawer – Quick-assign staff & boats to a session.
 * Manager-gated. Shows conflict warnings before saving.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useSessionConflicts, totalConflictCount } from '@/hooks/useSessionConflicts';
import { sessionsOverlap } from '@/lib/ops/sessionsOverlap';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Plus, Trash2, Users, Anchor } from 'lucide-react';

interface SessionInfo {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  activity_name: string;
  capacity: number;
  resort_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: SessionInfo | null;
}

interface StaffOption { user_id: string; full_name: string; }
interface AssetOption { id: string; name: string; type: string; }
interface ExistingStaffAssignment { id: string; staff_user_id: string; role: string; full_name?: string; }
interface ExistingAssetAssignment { id: string; asset_id: string | null; asset_label: string; asset_type: string; }

export function SessionAssignDrawer({ open, onOpenChange, session }: Props) {
  const { user } = useAuth();
  const { currentDepartment, isManager } = useDepartment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resortId = currentDepartment?.resort_id;
  const deptKey = currentDepartment?.key;

  // Existing assignments
  const [staffAssignments, setStaffAssignments] = useState<ExistingStaffAssignment[]>([]);
  const [assetAssignments, setAssetAssignments] = useState<ExistingAssetAssignment[]>([]);

  // Available options
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);

  // Add form
  const [addStaffId, setAddStaffId] = useState('');
  const [addStaffRole, setAddStaffRole] = useState('guide');
  const [addAssetId, setAddAssetId] = useState('');

  // State
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Conflicts
  const { data: conflicts } = useSessionConflicts(resortId, session?.id);
  const conflictCount = conflicts ? totalConflictCount(conflicts) : 0;

  // Load data when drawer opens
  useEffect(() => {
    if (!open || !session || !resortId) return;
    loadAssignments();
    loadOptions();
  }, [open, session?.id, resortId]);

  const loadAssignments = async () => {
    if (!session) return;
    const [staffRes, assetRes] = await Promise.all([
      supabase
        .from('session_staff_assignments')
        .select('id, staff_user_id, role')
        .eq('session_id', session.id),
      supabase
        .from('session_asset_assignments')
        .select('id, asset_id, asset_label, asset_type')
        .eq('session_id', session.id),
    ]);

    const staffList = (staffRes.data ?? []) as ExistingStaffAssignment[];
    // Enrich with names
    if (staffList.length > 0) {
      const userIds = staffList.map(s => s.staff_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));
      for (const s of staffList) {
        s.full_name = nameMap.get(s.staff_user_id) ?? 'Unknown';
      }
    }
    setStaffAssignments(staffList);
    setAssetAssignments((assetRes.data ?? []) as ExistingAssetAssignment[]);
  };

  const loadOptions = async () => {
    if (!resortId || !deptKey) return;
    // Dept members as staff options
    const { data: members } = await supabase
      .from('department_memberships')
      .select('user_id')
      .eq('resort_id', resortId)
      .eq('department_key', deptKey)
      .eq('is_active', true);

    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      setStaffOptions(
        (profiles ?? []).map(p => ({ user_id: p.id, full_name: p.full_name ?? 'Unknown' }))
      );
    }

    // Assets (boats/equipment)
    const { data: assets } = await supabase
      .from('ops_assets')
      .select('id, name, type')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('name');
    setAssetOptions((assets ?? []) as AssetOption[]);
  };

  // Check for conflicts before adding staff
  const checkStaffConflict = async (staffUserId: string): Promise<string | null> => {
    if (!session || !resortId) return null;
    // Check if staff is already assigned to an overlapping session
    const { data: otherAssignments } = await supabase
      .from('session_staff_assignments')
      .select('session_id, role, session:activity_sessions(date, start_time, end_time, activity:activities(name))')
      .eq('staff_user_id', staffUserId)
      .eq('resort_id', resortId)
      .neq('session_id', session.id);

    for (const a of otherAssignments ?? []) {
      const s = a.session as any;
      if (!s || s.date !== session.date) continue;
      if (sessionsOverlap(session.start_time, session.end_time, s.start_time, s.end_time)) {
        return `Already assigned to ${s.activity?.name ?? 'another session'} (${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)})`;
      }
    }

    // Check if outside shift
    const { data: shifts } = await supabase
      .from('staff_shifts')
      .select('start_time, end_time')
      .eq('user_id', staffUserId)
      .eq('resort_id', resortId)
      .eq('shift_date', session.date);

    if (shifts && shifts.length > 0) {
      const coveredByShift = shifts.some(sh =>
        sh.start_time <= session.start_time && sh.end_time >= session.end_time
      );
      if (!coveredByShift) {
        return 'Session falls outside their scheduled shift';
      }
    }

    return null;
  };

  // Check for conflicts before adding asset
  const checkAssetConflict = async (assetId: string): Promise<string | null> => {
    if (!session || !resortId) return null;
    const { data: otherAssignments } = await supabase
      .from('session_asset_assignments')
      .select('session_id, session:activity_sessions(date, start_time, end_time, activity:activities(name))')
      .eq('asset_id', assetId)
      .eq('resort_id', resortId)
      .neq('session_id', session.id);

    for (const a of otherAssignments ?? []) {
      const s = a.session as any;
      if (!s || s.date !== session.date) continue;
      if (sessionsOverlap(session.start_time, session.end_time, s.start_time, s.end_time)) {
        return `Already assigned to ${s.activity?.name ?? 'another session'} (${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)})`;
      }
    }

    // Check unavailability
    const { data: unavail } = await supabase
      .from('asset_unavailability')
      .select('start_time, end_time, reason')
      .eq('asset_id', assetId)
      .eq('resort_id', resortId)
      .eq('unavailable_date', session.date);

    for (const u of unavail ?? []) {
      if (!u.start_time || !u.end_time) {
        return `Marked unavailable: ${u.reason || 'maintenance'}`;
      }
      if (sessionsOverlap(session.start_time, session.end_time, u.start_time, u.end_time)) {
        return `Unavailable ${u.start_time.slice(0, 5)}–${u.end_time.slice(0, 5)}: ${u.reason || 'maintenance'}`;
      }
    }
    return null;
  };

  const handleAddStaff = async () => {
    if (!addStaffId || !session || !resortId) return;
    setSaving(true);
    setWarnings([]);

    const warning = await checkStaffConflict(addStaffId);
    if (warning) {
      setWarnings([warning]);
      // Still allow saving — warning-first approach
      const confirmed = window.confirm(`⚠️ ${warning}\n\nAssign anyway?`);
      if (!confirmed) { setSaving(false); return; }
    }

    const { error } = await supabase.from('session_staff_assignments').insert({
      session_id: session.id,
      resort_id: resortId,
      staff_user_id: addStaffId,
      role: addStaffRole,
      assigned_by: user?.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Staff assigned' });
      setAddStaffId('');
      await loadAssignments();
      queryClient.invalidateQueries({ queryKey: ['dept-planner-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['session-conflicts'] });
    }
    setSaving(false);
  };

  const handleAddAsset = async () => {
    if (!addAssetId || !session || !resortId) return;
    setSaving(true);
    setWarnings([]);

    const asset = assetOptions.find(a => a.id === addAssetId);
    const warning = await checkAssetConflict(addAssetId);
    if (warning) {
      setWarnings([warning]);
      const confirmed = window.confirm(`⚠️ ${warning}\n\nAssign anyway?`);
      if (!confirmed) { setSaving(false); return; }
    }

    const assetType = asset?.type === 'BOAT' ? 'boat' : 'equipment';
    const { error } = await supabase.from('session_asset_assignments').insert({
      session_id: session.id,
      resort_id: resortId,
      asset_id: addAssetId,
      asset_label: asset?.name ?? 'Unknown',
      asset_type: assetType as any,
      assigned_by: user?.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Asset assigned' });
      setAddAssetId('');
      await loadAssignments();
      queryClient.invalidateQueries({ queryKey: ['dept-planner-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['session-conflicts'] });
    }
    setSaving(false);
  };

  const handleRemoveStaff = async (assignmentId: string) => {
    const { error } = await supabase.from('session_staff_assignments').delete().eq('id', assignmentId);
    if (!error) {
      await loadAssignments();
      queryClient.invalidateQueries({ queryKey: ['dept-planner-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['session-conflicts'] });
    }
  };

  const handleRemoveAsset = async (assignmentId: string) => {
    const { error } = await supabase.from('session_asset_assignments').delete().eq('id', assignmentId);
    if (!error) {
      await loadAssignments();
      queryClient.invalidateQueries({ queryKey: ['dept-planner-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['session-conflicts'] });
    }
  };

  if (!session) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{session.activity_name}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {session.date} · {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Conflict banner */}
          {conflictCount > 0 && (
            <Alert variant="destructive" className="border-warning/50 bg-warning/5 text-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs">
                {conflictCount} resource conflict{conflictCount > 1 ? 's' : ''} detected
              </AlertDescription>
            </Alert>
          )}

          {/* Staff assignments */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Crew ({staffAssignments.length})</Label>
            </div>

            {staffAssignments.map(a => (
              <div key={a.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.full_name}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.role}</Badge>
                </div>
                {isManager && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveStaff(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {isManager && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <Select value={addStaffId} onValueChange={setAddStaffId}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOptions
                        .filter(o => !staffAssignments.some(a => a.staff_user_id === o.user_id))
                        .map(o => (
                          <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={addStaffRole} onValueChange={setAddStaffRole}>
                    <SelectTrigger className="w-28 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="captain">Captain</SelectItem>
                      <SelectItem value="crew">Crew</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  disabled={!addStaffId || saving}
                  onClick={handleAddStaff}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Add Staff
                </Button>
              </div>
            )}
          </div>

          {/* Asset assignments */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Assets ({assetAssignments.length})</Label>
            </div>

            {assetAssignments.map(a => (
              <div key={a.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.asset_label}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.asset_type}</Badge>
                </div>
                {isManager && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveAsset(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {isManager && (
              <div className="space-y-2 pt-1">
                <Select value={addAssetId} onValueChange={setAddAssetId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assetOptions
                      .filter(o => !assetAssignments.some(a => a.asset_id === o.id))
                      .map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} <span className="text-muted-foreground ml-1">({o.type})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  disabled={!addAssetId || saving}
                  onClick={handleAddAsset}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Add Asset
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
