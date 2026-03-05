/**
 * usePlannerState – Persist & restore planner UI state across navigation.
 *
 * Stores: viewMode, attentionMode, date
 * Keyed by: resort_id + user_id
 * Falls back to sensible defaults when no stored state exists.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export type PlannerViewMode = 'sessions' | 'staff' | 'boats';

interface PlannerPersistedState {
  viewMode: PlannerViewMode;
  attentionMode: boolean;
  date: string;
}

const STORAGE_KEY_PREFIX = 'propera-planner-state';

function getStorageKey(resortId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${resortId}:${userId}`;
}

function readStored(resortId: string | undefined, userId: string | undefined): Partial<PlannerPersistedState> {
  if (!resortId || !userId) return {};
  try {
    const raw = localStorage.getItem(getStorageKey(resortId, userId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PlannerPersistedState>;
  } catch {
    return {};
  }
}

function writeStored(resortId: string | undefined, userId: string | undefined, state: PlannerPersistedState) {
  if (!resortId || !userId) return;
  try {
    localStorage.setItem(getStorageKey(resortId, userId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable – silently ignore
  }
}

interface UsePlannerStateOptions {
  resortId: string | undefined;
  /** Initial date from URL search params (takes priority over stored) */
  urlDate?: string | null;
}

export function usePlannerState({ resortId, urlDate }: UsePlannerStateOptions) {
  const { user } = useAuth();
  const userId = user?.id;
  const initializedRef = useRef(false);

  // Read stored state once on mount
  const stored = useRef(readStored(resortId, userId)).current;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // URL date takes priority, then stored, then today
  const initialDate = urlDate || stored.date || todayStr;

  const [viewMode, setViewMode] = useState<PlannerViewMode>(stored.viewMode || 'sessions');
  const [attentionMode, setAttentionMode] = useState(stored.attentionMode ?? false);
  const [dateStr, setDateStr] = useState(initialDate);

  // Persist on change (debounced via effect)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    writeStored(resortId, userId, { viewMode, attentionMode, date: dateStr });
  }, [viewMode, attentionMode, dateStr, resortId, userId]);

  // If URL date changes externally, sync it
  useEffect(() => {
    if (urlDate && urlDate !== dateStr) {
      setDateStr(urlDate);
    }
  }, [urlDate]);

  return {
    viewMode,
    setViewMode,
    attentionMode,
    setAttentionMode,
    dateStr,
    setDateStr,
  };
}
