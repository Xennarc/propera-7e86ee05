/**
 * StaffLanesView – Shows staff members as rows with shift backgrounds
 * and session assignment blocks overlaid.
 * Managers can drag-to-create, resize, move, duplicate and delete shifts.
 * Mobile: long-press on empty lane opens create sheet.
 */
import { useMemo, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEditPlanner } from '@/hooks/useCanEditPlanner';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShiftEditor, timeToPercent, type DraftShift } from './useShiftEditor';
import { ShiftEditModal } from './ShiftEditModal';

interface Props {
  resortId: string;
  deptKey: string;
  date: string;
  onSessionClick: (sessionId: string) => void;
}

const HOUR_START = 6;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;

export function StaffLanesView({ resortId, deptKey, date, onSessionClick }: Props) {
  const { canEdit: canEditPlanner } = useCanEditPlanner();
  const { hasModule } = useDepartment();
  const { user } = useAuth();
  const canEdit = canEditPlanner && hasModule('resources_shifts' as any);

  // Get department members
  const { data: members = [] } = useQuery({
    queryKey: ['dept-staff-lanes-members', resortId, deptKey],
    queryFn: async () => {
      const { data: mems } = await supabase
        .from('department_memberships')
        .select('user_id')
        .eq('resort_id', resortId)
        .eq('department_key', deptKey)
        .eq('is_active', true);
      if (!mems || mems.length === 0) return [];
      const userIds = mems.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      return (profiles ?? []).map(p => ({ id: p.id, name: p.full_name ?? 'Unknown' }));
    },
    enabled: !!resortId && !!deptKey,
    staleTime: 60_000,
  });

  // Get shifts for the date
  const { data: shifts = [] } = useQuery({
    queryKey: ['dept-staff-shifts', resortId, deptKey, date],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('resort_id', resortId)
        .eq('department_key', deptKey)
        .eq('shift_date', date);
      return data ?? [];
    },
    enabled: !!resortId && !!date,
    staleTime: 30_000,
  });

  // Get staff assignments for sessions on this date
  const { data: assignments = [] } = useQuery({
    queryKey: ['dept-staff-assignments', resortId, date, deptKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('session_staff_assignments')
        .select(`
          id, staff_user_id, role,
          session:activity_sessions!inner(id, date, start_time, end_time, activity:activities(name, category))
        `)
        .eq('resort_id', resortId)
        .eq('session.date', date);
      return (data ?? []) as any[];
    },
    enabled: !!resortId && !!date,
    staleTime: 30_000,
  });

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members]);
  const filteredAssignments = useMemo(
    () => assignments.filter(a => memberIds.has(a.staff_user_id)),
    [assignments, memberIds]
  );

  const shiftsByUser = useMemo(() => {
    const map: Record<string, typeof shifts> = {};
    for (const s of shifts) map[s.user_id] = [...(map[s.user_id] ?? []), s];
    return map;
  }, [shifts]);

  const assignmentsByUser = useMemo(() => {
    const map: Record<string, typeof filteredAssignments> = {};
    for (const a of filteredAssignments) {
      map[a.staff_user_id] = [...(map[a.staff_user_id] ?? []), a];
    }
    return map;
  }, [filteredAssignments]);

  if (members.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No department members found.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Time header */}
      <div className="flex">
        <div className="w-28 shrink-0" />
        <div className="flex-1 relative h-6">
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute text-[9px] text-muted-foreground -translate-x-1/2"
              style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
            >
              {HOUR_START + i}:00
            </span>
          ))}
        </div>
      </div>

      {/* Staff lanes */}
      {members.map(member => (
        <StaffLane
          key={member.id}
          member={member}
          userShifts={shiftsByUser[member.id] ?? []}
          userAssignments={assignmentsByUser[member.id] ?? []}
          allShifts={shifts}
          resortId={resortId}
          deptKey={deptKey}
          date={date}
          canEdit={canEdit}
          currentUserId={user?.id}
          onSessionClick={onSessionClick}
        />
      ))}

      {canEdit && (
        <p className="text-[10px] text-muted-foreground pt-2 text-center">
          Drag on empty lane to create shift · Long-press on mobile · Tap shift to edit
        </p>
      )}
    </div>
  );
}

/* ─── Individual Lane ─── */

interface StaffLaneProps {
  member: { id: string; name: string };
  userShifts: any[];
  userAssignments: any[];
  allShifts: any[];
  resortId: string;
  deptKey: string;
  date: string;
  canEdit: boolean;
  currentUserId?: string;
  onSessionClick: (sessionId: string) => void;
}

function StaffLane({
  member, userShifts, userAssignments, allShifts,
  resortId, deptKey, date, canEdit, currentUserId, onSessionClick,
}: StaffLaneProps) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const queryClient = useQueryClient();

  const editor = useShiftEditor({
    resortId, deptKey, date,
    userId: member.id,
    canEdit,
    shifts: allShifts,
  });

  const { draft, showModal, handlePointerDown, handlePointerMove, handlePointerUp, saveNewShift, deleteShift, duplicateShift, openCreateModal, cancelDraft, getOverlapWarnings } = editor;

  // Only show draft for this user
  const activeDraft = draft?.userId === member.id ? draft : null;

  // --- Long-press support (mobile fallback) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canEdit) return;
    // Only trigger on empty lane (not shift blocks)
    if ((e.target as HTMLElement).closest('[data-shift-block]')) return;
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Vibrate if available
      navigator.vibrate?.(30);
      openCreateModal();
    }, 500);
  }, [canEdit, openCreateModal]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long-press if finger moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onLanePointerDown = useCallback((e: React.PointerEvent) => {
    if (!canEdit || !laneRef.current) return;
    if (longPressTriggeredRef.current) return; // Don't start drag if long-press fired
    if ((e.target as HTMLElement).closest('[data-shift-block]')) return;
    handlePointerDown(e, laneRef.current, 'create');
  }, [canEdit, handlePointerDown]);

  const onShiftPointerDown = useCallback((e: React.PointerEvent, shiftId: string, startTime: string, endTime: string) => {
    if (!canEdit || !laneRef.current) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const edgeThreshold = Math.min(12, rect.width * 0.15);

    let mode: 'move' | 'resize-start' | 'resize-end' = 'move';
    if (relX < edgeThreshold) mode = 'resize-start';
    else if (relX > rect.width - edgeThreshold) mode = 'resize-end';

    handlePointerDown(e, laneRef.current, mode, shiftId, startTime, endTime);
  }, [canEdit, handlePointerDown]);

  const handleShiftClick = useCallback((shiftId: string) => {
    if (!canEdit) return;
    setEditShiftId(shiftId);
  }, [canEdit]);

  const editShift = editShiftId ? userShifts.find(s => s.id === editShiftId) : null;

  return (
    <>
      <div className="flex items-stretch group">
        <div className="w-28 shrink-0 py-2 pr-2 text-right">
          <p className="text-xs font-medium truncate">{member.name}</p>
          {userShifts.length === 0 && (
            <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
              <Clock className="h-2.5 w-2.5" /> No shift
            </p>
          )}
        </div>
        <div
          ref={laneRef}
          className={cn(
            'flex-1 relative h-12 bg-muted/20 rounded border border-border/30 touch-none',
            canEdit && 'cursor-crosshair'
          )}
          onPointerDown={onLanePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* Shift backgrounds */}
          {userShifts.map(shift => {
            const left = timeToPercent(shift.start_time);
            const width = timeToPercent(shift.end_time) - left;
            return (
              <div
                key={shift.id}
                data-shift-block
                className={cn(
                  'absolute top-0 bottom-0 bg-primary/8 border-y border-primary/15 group/shift',
                  canEdit && 'cursor-grab active:cursor-grabbing hover:bg-primary/12 transition-colors'
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
                onPointerDown={canEdit ? (e) => onShiftPointerDown(e, shift.id, shift.start_time, shift.end_time) : undefined}
                onClick={canEdit ? (e) => { e.stopPropagation(); handleShiftClick(shift.id); } : undefined}
              >
                {canEdit && (
                  <>
                    {/* Resize handles */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover/shift:opacity-100 bg-primary/20 rounded-l transition-opacity" />
                    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover/shift:opacity-100 bg-primary/20 rounded-r transition-opacity" />
                  </>
                )}
                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-primary/50 font-medium pointer-events-none select-none">
                  {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                </span>
              </div>
            );
          })}

          {/* Draft block (while dragging) */}
          {activeDraft && (
            <div
              className="absolute top-0 bottom-0 bg-primary/20 border-2 border-primary/40 border-dashed rounded pointer-events-none z-10"
              style={{
                left: `${timeToPercent(activeDraft.startTime)}%`,
                width: `${Math.max(timeToPercent(activeDraft.endTime) - timeToPercent(activeDraft.startTime), 1)}%`,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[9px] text-primary font-semibold select-none">
                {activeDraft.startTime.slice(0, 5)}–{activeDraft.endTime.slice(0, 5)}
              </span>
            </div>
          )}

          {/* Session blocks */}
          {userAssignments.map(a => {
            const s = a.session;
            if (!s) return null;
            const left = timeToPercent(s.start_time);
            const width = timeToPercent(s.end_time) - left;
            const isOutsideShift = userShifts.length > 0 && !userShifts.some(
              (sh: any) => sh.start_time <= s.start_time && sh.end_time >= s.end_time
            );

            return (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'absolute top-1 bottom-1 rounded px-1 text-[10px] font-medium truncate cursor-pointer transition-colors z-20',
                      isOutsideShift
                        ? 'bg-warning/20 border border-warning/40 text-warning hover:bg-warning/30'
                        : 'bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25'
                    )}
                    style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                    onClick={(e) => { e.stopPropagation(); onSessionClick(s.id); }}
                  >
                    {s.activity?.name}
                    {isOutsideShift && <AlertTriangle className="inline h-2.5 w-2.5 ml-0.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p className="font-medium">{s.activity?.name}</p>
                  <p>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)} · {a.role}</p>
                  {isOutsideShift && <p className="text-warning mt-1">⚠ Outside scheduled shift</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Hour grid lines */}
          {Array.from({ length: TOTAL_HOURS }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-border/20 pointer-events-none"
              style={{ left: `${((i + 1) / TOTAL_HOURS) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showModal && activeDraft && activeDraft.mode === 'create' && (
        <ShiftEditModal
          open={showModal}
          onOpenChange={(v) => { if (!v) cancelDraft(); }}
          staffName={member.name}
          date={date}
          startTime={activeDraft.startTime}
          endTime={activeDraft.endTime}
          warnings={getOverlapWarnings(activeDraft.startTime, activeDraft.endTime)}
          onSave={(s, e) => saveNewShift(s, e, currentUserId)}
          onCancel={cancelDraft}
        />
      )}

      {/* Edit modal (click on existing shift) */}
      {editShift && (
        <ShiftEditModal
          open={!!editShiftId}
          onOpenChange={(v) => { if (!v) setEditShiftId(null); }}
          staffName={member.name}
          date={date}
          startTime={editShift.start_time}
          endTime={editShift.end_time}
          shiftId={editShift.id}
          warnings={getOverlapWarnings(editShift.start_time, editShift.end_time, editShift.id)}
          onSave={async (s, e) => {
            await supabase.from('staff_shifts').update({ start_time: s, end_time: e }).eq('id', editShift.id);
            setEditShiftId(null);
            queryClient.invalidateQueries({ queryKey: ['dept-staff-shifts'] });
          }}
          onDelete={async () => {
            await deleteShift(editShift.id);
            setEditShiftId(null);
          }}
          onDuplicate={async () => {
            await duplicateShift(editShift.id);
            setEditShiftId(null);
          }}
          onCancel={() => setEditShiftId(null)}
        />
      )}
    </>
  );
}
