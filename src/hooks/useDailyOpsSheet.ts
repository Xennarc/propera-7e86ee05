/**
 * useDailyOpsSheet – Single-query aggregator for the Master Ops Sheet.
 *
 * Calls get_daily_ops_sheet(resort_id, date, department) RPC and returns
 * fully typed data. Cached per resort/date/department for smooth tab switching.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────

export type OpsDepartment = 'DIVE' | 'WATERSPORT' | 'EXCURSION' | 'SPA' | 'OTHER' | null;

export interface OpsSheetSummary {
  sessions: number;
  total_guests: number;
  pickups_required: number;
  missing_readiness: number;
  pending_medical: number;
  unverified_certs: number;
  conflicts: number;
}

export interface OpsReadiness {
  ready: number;
  missing: number;
  pending_medical: number;
  unverified_certs: number;
}

export interface OpsCrewMember {
  staff_user_id: string;
  role: string;
  name: string;
  conflict?: boolean;
}

export interface OpsEquipment {
  name: string;
  qty: number;
  conflict?: boolean;
}

export interface OpsBoatAssignment {
  name: string;
  asset_id: string;
  conflict?: boolean;
}

export interface OpsPickup {
  trip_id: string;
  status: string;
  has_driver: boolean;
}

export interface OpsBlocker {
  type: 'unverified_cert' | 'pending_medical';
  count: number;
}

export interface OpsSessionRow {
  session_id: string;
  start_time: string;
  end_time: string;
  activity_name: string;
  category: string;
  location: string | null;
  status: string;
  capacity: number;
  booked: number;
  total_pax: number;
  readiness: OpsReadiness;
  assignments: {
    boat: OpsBoatAssignment | null;
    crew: OpsCrewMember[];
    equipment: OpsEquipment[];
  };
  pickup: OpsPickup | null;
  conflicts_count: number;
  blockers: OpsBlocker[];
  session_notes: string | null;
  requirements_json: Record<string, unknown> | null;
}

export interface DailyOpsSheet {
  date: string;
  department: string;
  summary: OpsSheetSummary;
  rows: OpsSessionRow[];
}

const EMPTY_SHEET: DailyOpsSheet = {
  date: '',
  department: 'all',
  summary: {
    sessions: 0,
    total_guests: 0,
    pickups_required: 0,
    missing_readiness: 0,
    pending_medical: 0,
    unverified_certs: 0,
    conflicts: 0,
  },
  rows: [],
};

// ── Query key factory ────────────────────────────────────────────

export const dailyOpsKeys = {
  sheet: (resortId: string, date: string, dept: string | null) =>
    ['daily-ops-sheet', resortId, date, dept ?? 'all'] as const,
};

// ── Hook ─────────────────────────────────────────────────────────

export function useDailyOpsSheet(
  resortId: string | undefined,
  date: string | undefined,
  department: OpsDepartment = null,
) {
  return useQuery({
    queryKey: dailyOpsKeys.sheet(resortId!, date!, department),
    queryFn: async (): Promise<DailyOpsSheet> => {
      const { data, error } = await supabase.rpc('get_daily_ops_sheet', {
        p_resort_id: resortId!,
        p_date: date!,
        p_department: department,
      });
      if (error) throw error;
      if (!data) return EMPTY_SHEET;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        date: parsed.date ?? date!,
        department: parsed.department ?? 'all',
        summary: {
          sessions: parsed.summary?.sessions ?? 0,
          total_guests: parsed.summary?.total_guests ?? 0,
          pickups_required: parsed.summary?.pickups_required ?? 0,
          missing_readiness: parsed.summary?.missing_readiness ?? 0,
          pending_medical: parsed.summary?.pending_medical ?? 0,
          unverified_certs: parsed.summary?.unverified_certs ?? 0,
          conflicts: parsed.summary?.conflicts ?? 0,
        },
        rows: (parsed.rows ?? []).map((r: any): OpsSessionRow => ({
          session_id: r.session_id,
          start_time: r.start_time,
          end_time: r.end_time,
          activity_name: r.activity_name,
          category: r.category,
          location: r.location ?? null,
          status: r.status,
          capacity: r.capacity ?? 0,
          booked: r.booked ?? 0,
          total_pax: r.total_pax ?? 0,
          readiness: {
            ready: r.readiness?.ready ?? 0,
            missing: r.readiness?.missing ?? 0,
            pending_medical: r.readiness?.pending_medical ?? 0,
            unverified_certs: r.readiness?.unverified_certs ?? 0,
          },
          assignments: {
            boat: r.assignments?.boat ?? null,
            crew: r.assignments?.crew ?? [],
            equipment: r.assignments?.equipment ?? [],
          },
          pickup: r.pickup ?? null,
          conflicts_count: r.conflicts_count ?? 0,
          blockers: r.blockers ?? [],
          session_notes: r.session_notes ?? null,
          requirements_json: r.requirements_json ?? null,
        })),
      };
    },
    enabled: !!resortId && !!date,
    staleTime: 30_000, // 30s — smooth tab switching
    refetchInterval: 60_000, // auto-refresh every minute
  });
}
