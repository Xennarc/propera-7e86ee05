/**
 * SessionAssignDrawer – Quick-assign staff & boats to a session.
 * Manager-gated. Shows availability signals and conflict warnings.
 *
 * Staff availability dots:
 *   🟢 on shift & free   🟡 on shift but assigned elsewhere   🔴 not on shift
 *
 * Boat badges:
 *   Conflict / Unavailable shown inline
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { computeCoverage, type CoverageResult } from '@/lib/ops/coverageRules';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useCanEditPlanner } from '@/hooks/useCanEditPlanner';
import { useSessionConflicts, totalConflictCount } from '@/hooks/useSessionConflicts';
import { sessionsOverlap } from '@/lib/ops/sessionsOverlap';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { AlertTriangle, Loader2, Plus, Trash2, Users, Anchor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */

export interface SessionInfo {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  activity_name: string;
  capacity: number;
  resort_id: string;
  ops_rules_json?: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: SessionInfo | null;
}

interface StaffOption {
  user_id: string;
  full_name: string;
}

interface AssetOption {
  id: string;
  name: string;
  type: string;
}

type AvailabilitySignal = 'free' | 'busy' | 'off-shift';

interface StaffWithSignal extends StaffOption {
  signal: AvailabilitySignal;
  conflictLabel?: string;
}

interface AssetWithSignal extends AssetOption {
  conflictLabel?: string;
}

interface ExistingStaffAssignment {
  id: string;
  staff_user_id: string;
  role: string;
  full_name?: string;
}

interface ExistingAssetAssignment {
  id: string;
  asset_id: string | null;
  asset_label: string;
  asset_type: string;
}

const ROLE_TABS = [
  { key: 'guide', label: 'Guide' },
  { key: 'instructor', label: 'Instructor' },
  { key: 'captain', label: 'Captain' },
  { key: 'crew', label: 'Crew' },
] as const;

/* ─── Component ─── */

export function SessionAssignDrawer({ open, onOpenChange, session }: Props) {
  const { user } = useAuth();
  const { currentDepartment, hasModule } = useDepartment();
  const { canEdit: canEditPlanner } = useCanEditPlanner();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Granular permission checks
  const canAssignCrew = canEditPlanner && hasModule('session_run_sheet' as any);
  const canAssignBoat = canEditPlanner && hasModule('resources_assets' as any);
  const canAssignAnything = canAssignCrew || canAssignBoat;

  const resortId = currentDepartment?.resort_id;
  const deptKey = currentDepartment?.key;

  // Existing assignments
  const [staffAssignments, setStaffAssignments] = useState<ExistingStaffAssignment[]>([]);
  const [assetAssignments, setAssetAssignments] = useState<ExistingAssetAssignment[]>([]);

  // Available options with signals
  const [staffWithSignals, setStaffWithSignals] = useState<StaffWithSignal[]>([]);
  const [assetsWithSignals, setAssetsWithSignals] = useState<AssetWithSignal[]>([]);

  // Role tab for crew assignment
  const [activeRole, setActiveRole] = useState<string>('guide');

  // State
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Conflicts
  const { data: conflicts, refetch: refetchConflicts } = useSessionConflicts(resortId, session?.id);
  const conflictCount = conflicts ? totalConflictCount(conflicts) : 0;

  // Booking count
  const { data: bookedCount = 0 } = useQuery({
    queryKey: ['session-booked-count', session?.id],
    queryFn: async () => {
      if (!session) return 0;
      const { data } = await supabase
        .from('activity_bookings')
        .select('num_adults, num_children')
        .eq('session_id', session.id)
        .in('status', ['CONFIRMED', 'PENDING']);
      return (data ?? []).reduce((sum, b) => sum + b.num_adults + b.num_children, 0);
    },
    enabled: !!session?.id && open,
    staleTime: 15_000,
  });

  // Load data when drawer opens
  useEffect(() => {
    if (!open || !session || !resortId) return;
    loadAssignments();
    loadOptionsWithSignals();
  }, [open, session?.id, resortId]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dept-planner-conflicts'] });
    queryClient.invalidateQueries({ queryKey: ['session-conflicts'] });
    queryClient.invalidateQueries({ queryKey: ['dept-staff-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['session-booked-count'] });
  }, [queryClient]);

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

  const loadOptionsWithSignals = async () => {
    if (!resortId || !deptKey || !session) return;

    // 1) Dept members
    const { data: members } = await supabase
      .from('department_memberships')
      .select('user_id')
      .eq('resort_id', resortId)
      .eq('department_key', deptKey)
      .eq('is_active', true);

    const userIds = (members ?? []).map(m => m.user_id);
    if (userIds.length === 0) { setStaffWithSignals([]); return; }

    // 2) Profiles, shifts, and other assignments in parallel
    const [profilesRes, shiftsRes, otherAssignRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', userIds),
      supabase.from('staff_shifts').select('user_id, start_time, end_time')
        .eq('resort_id', resortId).eq('shift_date', session.date),
      supabase.from('session_staff_assignments')
        .select('staff_user_id, session:activity_sessions!inner(date, start_time, end_time, activity:activities(name))')
        .eq('resort_id', resortId)
        .neq('session_id', session.id),
    ]);

    const profiles = profilesRes.data ?? [];
    const shifts = shiftsRes.data ?? [];
    const otherAssigns = (otherAssignRes.data ?? []) as any[];

    // Build shift map: userId -> shifts[]
    const shiftMap = new Map<string, { start_time: string; end_time: string }[]>();
    for (const s of shifts) {
      const arr = shiftMap.get(s.user_id) ?? [];
      arr.push({ start_time: s.start_time, end_time: s.end_time });
      shiftMap.set(s.user_id, arr);
    }

    // Build busy map: userId -> conflicting session names
    const busyMap = new Map<string, string>();
    for (const a of otherAssigns) {
      const s = a.session as any;
      if (!s || s.date !== session.date) continue;
      if (sessionsOverlap(session.start_time, session.end_time, s.start_time, s.end_time)) {
        busyMap.set(a.staff_user_id,
          `Assigned to ${s.activity?.name ?? 'session'} (${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)})`
        );
      }
    }

    const result: StaffWithSignal[] = profiles.map(p => {
      const userShifts = shiftMap.get(p.id);
      const busyLabel = busyMap.get(p.id);

      // Determine signal
      let signal: AvailabilitySignal = 'off-shift';
      if (userShifts && userShifts.length > 0) {
        const onShift = userShifts.some(sh =>
          sh.start_time <= session.start_time && sh.end_time >= session.end_time
        );
        if (onShift) {
          signal = busyLabel ? 'busy' : 'free';
        }
      } else {
        // No shifts registered — treat as potentially available (no shift constraint)
        signal = busyLabel ? 'busy' : 'free';
      }

      return {
        user_id: p.id,
        full_name: p.full_name ?? 'Unknown',
        signal,
        conflictLabel: busyLabel || (signal === 'off-shift' ? 'Not on shift' : undefined),
      };
    });

    // Sort: free first, then busy, then off-shift
    const order: Record<AvailabilitySignal, number> = { free: 0, busy: 1, 'off-shift': 2 };
    result.sort((a, b) => order[a.signal] - order[b.signal] || a.full_name.localeCompare(b.full_name));
    setStaffWithSignals(result);

    // 3) Assets with conflict signals
    const { data: assets } = await supabase
      .from('ops_assets')
      .select('id, name, type')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('name');

    if (!assets) { setAssetsWithSignals([]); return; }

    const [assetAssignsRes, unavailRes] = await Promise.all([
      supabase.from('session_asset_assignments')
        .select('asset_id, session:activity_sessions!inner(date, start_time, end_time, activity:activities(name))')
        .eq('resort_id', resortId)
        .neq('session_id', session.id),
      supabase.from('asset_unavailability')
        .select('asset_id, start_time, end_time, reason')
        .eq('resort_id', resortId)
        .eq('unavailable_date', session.date),
    ]);

    const assetConflicts = new Map<string, string>();
    for (const a of (assetAssignsRes.data ?? []) as any[]) {
      const s = a.session as any;
      if (!s || s.date !== session.date) continue;
      if (sessionsOverlap(session.start_time, session.end_time, s.start_time, s.end_time)) {
        assetConflicts.set(a.asset_id,
          `In use: ${s.activity?.name ?? 'session'} ${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)}`
        );
      }
    }
    for (const u of unavailRes.data ?? []) {
      if (!u.asset_id) continue;
      if (!u.start_time || !u.end_time) {
        assetConflicts.set(u.asset_id, `Unavailable: ${u.reason || 'maintenance'}`);
      } else if (sessionsOverlap(session.start_time, session.end_time, u.start_time, u.end_time)) {
        assetConflicts.set(u.asset_id, `Unavailable ${u.start_time.slice(0, 5)}–${u.end_time.slice(0, 5)}`);
      }
    }

    setAssetsWithSignals(assets.map(a => ({
      ...a,
      conflictLabel: assetConflicts.get(a.id),
    })));
  };

  /* ─── Actions ─── */

  const assignStaff = async (staffUserId: string, role: string) => {
    if (!session || !resortId) return;
    const staff = staffWithSignals.find(s => s.user_id === staffUserId);

    const doAssign = async () => {
      setSaving(true);
      const { error } = await supabase.from('session_staff_assignments').insert({
        session_id: session.id,
        resort_id: resortId,
        staff_user_id: staffUserId,
        role,
        assigned_by: user?.id,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `${staff?.full_name ?? 'Staff'} assigned as ${role}` });
        await loadAssignments();
        await loadOptionsWithSignals();
        invalidateAll();
        refetchConflicts();
      }
      setSaving(false);
    };

    // If conflict, show confirm dialog
    if (staff?.conflictLabel) {
      setConfirmDialog({
        message: `${staff.full_name}: ${staff.conflictLabel}.\n\nAssign as ${role} anyway?`,
        onConfirm: doAssign,
      });
    } else {
      await doAssign();
    }
  };

  const assignAsset = async (assetId: string) => {
    if (!session || !resortId) return;
    const asset = assetsWithSignals.find(a => a.id === assetId);

    const doAssign = async () => {
      setSaving(true);
      const assetType = asset?.type === 'BOAT' ? 'boat' : 'equipment';
      const { error } = await supabase.from('session_asset_assignments').insert({
        session_id: session.id,
        resort_id: resortId,
        asset_id: assetId,
        asset_label: asset?.name ?? 'Unknown',
        asset_type: assetType as any,
        assigned_by: user?.id,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `${asset?.name ?? 'Asset'} assigned` });
        await loadAssignments();
        await loadOptionsWithSignals();
        invalidateAll();
        refetchConflicts();
      }
      setSaving(false);
    };

    if (asset?.conflictLabel) {
      setConfirmDialog({
        message: `${asset.name}: ${asset.conflictLabel}.\n\nAssign anyway?`,
        onConfirm: doAssign,
      });
    } else {
      await doAssign();
    }
  };

  const removeStaff = async (assignmentId: string) => {
    const { error } = await supabase.from('session_staff_assignments').delete().eq('id', assignmentId);
    if (!error) {
      await loadAssignments();
      await loadOptionsWithSignals();
      invalidateAll();
      refetchConflicts();
    }
  };

  const removeAsset = async (assignmentId: string) => {
    const { error } = await supabase.from('session_asset_assignments').delete().eq('id', assignmentId);
    if (!error) {
      await loadAssignments();
      await loadOptionsWithSignals();
      invalidateAll();
      refetchConflicts();
    }
  };

  if (!session) return null;

  const availableStaff = staffWithSignals.filter(
    s => !staffAssignments.some(a => a.staff_user_id === s.user_id)
  );
  const availableAssets = assetsWithSignals.filter(
    a => !assetAssignments.some(ea => ea.asset_id === a.id)
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{session.activity_name}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {session.date} · {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
            </p>
          </SheetHeader>

          <div className="mt-4 space-y-5">
            {/* Summary strip */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{bookedCount}</span>
                <span className="text-muted-foreground">/ {session.capacity}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50">
                <Anchor className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{assetAssignments.length}</span>
                <span className="text-muted-foreground">boat{assetAssignments.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50">
                <span className="font-medium">{staffAssignments.length}</span>
                <span className="text-muted-foreground">crew</span>
              </div>
              {conflictCount > 0 && (
                <Badge variant="outline" className="text-[10px] border-warning/50 text-warning gap-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  {conflictCount}
                </Badge>
              )}
            </div>

            {/* Coverage details */}
            {(() => {
              const roleCounts: Record<string, number> = {};
              for (const a of staffAssignments) {
                roleCounts[a.role] = (roleCounts[a.role] ?? 0) + 1;
              }
              const coverage = computeCoverage({
                opsRules: session.ops_rules_json,
                assignedRoles: roleCounts,
                assignedBoats: assetAssignments.length,
                bookedCount: bookedCount,
              });
              if (coverage.details.length === 0) return null;
              return (
                <Alert
                  variant={coverage.status === 'red' ? 'destructive' : undefined}
                  className={cn(
                    'text-foreground',
                    coverage.status === 'amber' && 'border-warning/50 bg-warning/5',
                    coverage.status === 'red' && 'border-destructive/50 bg-destructive/5',
                  )}
                >
                  <AlertTriangle className={cn(
                    'h-4 w-4',
                    coverage.status === 'amber' && 'text-warning',
                    coverage.status === 'red' && 'text-destructive',
                  )} />
                  <AlertDescription className="text-xs space-y-0.5">
                    {coverage.details.map((d, i) => <p key={i}>{d}</p>)}
                  </AlertDescription>
                </Alert>
              );
            })()}

            {/* ─── BOAT SECTION ─── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Anchor className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Boat / Asset</Label>
              </div>

              {/* Existing assignments as chips */}
              <div className="flex flex-wrap gap-1.5">
                {assetAssignments.map(a => (
                  <Badge key={a.id} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs">
                    {a.asset_label}
                    {canAssignBoat && (
                      <button
                        className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                        onClick={() => removeAsset(a.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </Badge>
                ))}
                {assetAssignments.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No boat assigned</span>
                )}
              </div>

              {/* Asset picker */}
              {canAssignBoat && availableAssets.length > 0 && (
                <div className="grid gap-1 max-h-32 overflow-y-auto">
                  {availableAssets.map(asset => (
                    <button
                      key={asset.id}
                      disabled={saving}
                      className={cn(
                        'flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs transition-colors',
                        'hover:bg-muted/80 border border-transparent hover:border-border/50',
                        asset.conflictLabel && 'opacity-70'
                      )}
                      onClick={() => assignAsset(asset.id)}
                    >
                      <span className="font-medium flex-1 truncate">{asset.name}</span>
                      <span className="text-muted-foreground">{asset.type}</span>
                      {asset.conflictLabel && (
                        <Badge variant="outline" className="text-[9px] border-warning/50 text-warning shrink-0">
                          Conflict
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ─── CREW SECTION ─── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Crew</Label>
              </div>

              {/* Existing crew as chips */}
              <div className="flex flex-wrap gap-1.5">
                {staffAssignments.map(a => (
                  <Badge key={a.id} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs">
                    {a.full_name}
                    <span className="text-muted-foreground capitalize">· {a.role}</span>
                    {canAssignCrew && (
                      <button
                        className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                        onClick={() => removeStaff(a.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </Badge>
                ))}
                {staffAssignments.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No crew assigned</span>
                )}
              </div>

              {/* Role tabs + staff picker */}
              {canAssignCrew && (
                <div className="space-y-2">
                  <SegmentedTabs
                    tabs={ROLE_TABS.map(r => ({ key: r.key, label: r.label }))}
                    activeKey={activeRole}
                    onChange={setActiveRole}
                  />

                  <div className="grid gap-1 max-h-40 overflow-y-auto">
                    {availableStaff.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">All staff assigned</p>
                    )}
                    {availableStaff.map(staff => (
                      <button
                        key={staff.user_id}
                        disabled={saving}
                        className={cn(
                          'flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs transition-colors',
                          'hover:bg-muted/80 border border-transparent hover:border-border/50',
                        )}
                        onClick={() => assignStaff(staff.user_id, activeRole)}
                      >
                        {/* Availability dot */}
                        <span className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          staff.signal === 'free' && 'bg-[hsl(var(--success,142_76%_36%))]',
                          staff.signal === 'busy' && 'bg-[hsl(var(--warning,38_92%_50%))]',
                          staff.signal === 'off-shift' && 'bg-destructive/60',
                        )} />
                        <span className="font-medium flex-1 truncate">{staff.full_name}</span>
                        {staff.conflictLabel && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {staff.conflictLabel}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {saving && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Conflict confirm dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(v) => { if (!v) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Conflict Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line text-sm">
              {confirmDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const fn = confirmDialog?.onConfirm;
                setConfirmDialog(null);
                if (fn) await fn();
              }}
            >
              Assign Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
