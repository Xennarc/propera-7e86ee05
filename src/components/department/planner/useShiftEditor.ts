/**
 * useShiftEditor – Manages drag-to-create, resize, move interactions
 * for staff shifts on the timeline. 15-min snap grid, optimistic UI.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const HOUR_START = 6;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const SNAP_MINUTES = 15;

export type DragMode = 'create' | 'move' | 'resize-start' | 'resize-end';

export interface DraftShift {
  userId: string;
  startTime: string;
  endTime: string;
  mode: DragMode;
  /** Original shift id when editing */
  shiftId?: string;
}

interface ShiftRow {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  shift_date: string;
  resort_id: string;
  department_key: string;
}

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function percentToTime(pct: number): string {
  const totalMinutes = (pct / 100) * TOTAL_HOURS * 60;
  const snapped = snapToGrid(totalMinutes);
  const h = Math.floor(snapped / 60) + HOUR_START;
  const m = snapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToPercent(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const hours = h + m / 60;
  return Math.max(0, Math.min(100, ((hours - HOUR_START) / TOTAL_HOURS) * 100));
}

function clientXToPercent(clientX: number, laneEl: HTMLElement): number {
  const rect = laneEl.getBoundingClientRect();
  return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
}

interface UseShiftEditorOpts {
  resortId: string;
  deptKey: string;
  date: string;
  userId: string;
  canEdit: boolean;
  shifts: ShiftRow[];
}

export function useShiftEditor({ resortId, deptKey, date, userId, canEdit, shifts }: UseShiftEditorOpts) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<DraftShift | null>(null);
  const [showModal, setShowModal] = useState(false);
  const dragRef = useRef<{
    mode: DragMode;
    laneEl: HTMLElement;
    startPct: number;
    shiftId?: string;
    origStart: string;
    origEnd: string;
  } | null>(null);

  const invalidateShifts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dept-staff-shifts'] });
    queryClient.invalidateQueries({ queryKey: ['dept-shifts'] });
    queryClient.invalidateQueries({ queryKey: ['dept-staff-lanes-members'] });
  }, [queryClient]);

  // Check for overlaps with other shifts for same user
  const getOverlapWarnings = useCallback((startTime: string, endTime: string, excludeId?: string): string[] => {
    const warnings: string[] = [];
    for (const s of shifts) {
      if (s.user_id !== userId) continue;
      if (excludeId && s.id === excludeId) continue;
      if (s.start_time < endTime && startTime < s.end_time) {
        warnings.push(`Overlaps with existing shift ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`);
      }
    }
    return warnings;
  }, [shifts, userId]);

  // --- Pointer handlers for lanes ---
  const handlePointerDown = useCallback((e: React.PointerEvent, laneEl: HTMLElement, mode: DragMode, shiftId?: string, origStart?: string, origEnd?: string) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const pct = clientXToPercent(e.clientX, laneEl);
    const time = percentToTime(pct);

    dragRef.current = {
      mode,
      laneEl,
      startPct: pct,
      shiftId,
      origStart: origStart ?? time,
      origEnd: origEnd ?? time,
    };

    if (mode === 'create') {
      setDraft({ userId, startTime: time, endTime: time, mode: 'create' });
    } else if (mode === 'move' && shiftId) {
      setDraft({ userId, startTime: origStart!, endTime: origEnd!, mode: 'move', shiftId });
    } else if ((mode === 'resize-start' || mode === 'resize-end') && shiftId) {
      setDraft({ userId, startTime: origStart!, endTime: origEnd!, mode, shiftId });
    }
  }, [canEdit, userId]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ref = dragRef.current;
    if (!ref || !draft) return;
    const pct = clientXToPercent(e.clientX, ref.laneEl);
    const time = percentToTime(pct);

    if (ref.mode === 'create') {
      const startTime = percentToTime(Math.min(ref.startPct, pct));
      const endTime = percentToTime(Math.max(ref.startPct, pct));
      setDraft(d => d ? { ...d, startTime, endTime } : null);
    } else if (ref.mode === 'move') {
      const deltaPct = pct - ref.startPct;
      const origStartPct = timeToPercent(ref.origStart);
      const origEndPct = timeToPercent(ref.origEnd);
      const newStartPct = Math.max(0, Math.min(100 - (origEndPct - origStartPct), origStartPct + deltaPct));
      const newEndPct = newStartPct + (origEndPct - origStartPct);
      setDraft(d => d ? { ...d, startTime: percentToTime(newStartPct), endTime: percentToTime(newEndPct) } : null);
    } else if (ref.mode === 'resize-start') {
      const newStart = percentToTime(Math.min(pct, timeToPercent(ref.origEnd) - 1));
      setDraft(d => d ? { ...d, startTime: newStart } : null);
    } else if (ref.mode === 'resize-end') {
      const newEnd = percentToTime(Math.max(pct, timeToPercent(ref.origStart) + 1));
      setDraft(d => d ? { ...d, endTime: newEnd } : null);
    }
  }, [draft]);

  const handlePointerUp = useCallback(() => {
    const ref = dragRef.current;
    dragRef.current = null;

    if (!draft) return;

    // For create: show modal if meaningful duration (>= 15 min)
    if (draft.mode === 'create') {
      if (draft.startTime !== draft.endTime) {
        setShowModal(true);
      } else {
        setDraft(null);
      }
      return;
    }

    // For move/resize: save directly (optimistic)
    if (draft.shiftId && (draft.mode === 'move' || draft.mode === 'resize-start' || draft.mode === 'resize-end')) {
      saveShiftUpdate(draft.shiftId, draft.startTime, draft.endTime);
      setDraft(null);
    }
  }, [draft]);

  const saveShiftUpdate = useCallback(async (shiftId: string, startTime: string, endTime: string) => {
    // Optimistic: invalidate immediately
    const { error } = await supabase
      .from('staff_shifts')
      .update({ start_time: startTime, end_time: endTime })
      .eq('id', shiftId);

    if (error) {
      toast({ title: 'Failed to update shift', description: error.message, variant: 'destructive' });
    }
    invalidateShifts();
  }, [toast, invalidateShifts]);

  const saveNewShift = useCallback(async (startTime: string, endTime: string, createdBy?: string) => {
    const { error } = await supabase.from('staff_shifts').insert({
      resort_id: resortId,
      department_key: deptKey,
      user_id: userId,
      shift_date: date,
      start_time: startTime,
      end_time: endTime,
      created_by: createdBy,
    });

    if (error) {
      toast({ title: 'Failed to create shift', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shift created' });
    }
    invalidateShifts();
    setDraft(null);
    setShowModal(false);
  }, [resortId, deptKey, userId, date, toast, invalidateShifts]);

  const deleteShift = useCallback(async (shiftId: string) => {
    const { error } = await supabase.from('staff_shifts').delete().eq('id', shiftId);
    if (error) {
      toast({ title: 'Failed to delete shift', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shift deleted' });
    }
    invalidateShifts();
  }, [toast, invalidateShifts]);

  /** Duplicate a shift to the next day (same times, same user) */
  const duplicateShift = useCallback(async (shiftId: string, targetDate?: string) => {
    const source = shifts.find(s => s.id === shiftId);
    if (!source) return;

    // Default to next day
    const nextDate = targetDate ?? (() => {
      const d = new Date(source.shift_date + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const { error } = await supabase.from('staff_shifts').insert({
      resort_id: source.resort_id,
      department_key: source.department_key,
      user_id: source.user_id,
      shift_date: nextDate,
      start_time: source.start_time,
      end_time: source.end_time,
    });

    if (error) {
      toast({ title: 'Failed to duplicate shift', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shift duplicated', description: `Copied to ${nextDate}` });
    }
    invalidateShifts();
  }, [shifts, toast, invalidateShifts]);

  /** Open create modal with preset times (for mobile long-press) */
  const openCreateModal = useCallback((startTime?: string, endTime?: string) => {
    setDraft({
      userId,
      startTime: startTime ?? '08:00',
      endTime: endTime ?? '12:00',
      mode: 'create',
    });
    setShowModal(true);
  }, [userId]);

  const cancelDraft = useCallback(() => {
    setDraft(null);
    setShowModal(false);
    dragRef.current = null;
  }, []);

  return {
    draft,
    showModal,
    setShowModal,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    saveNewShift,
    deleteShift,
    duplicateShift,
    openCreateModal,
    cancelDraft,
    getOverlapWarnings,
    timeToPercent,
  };
}
