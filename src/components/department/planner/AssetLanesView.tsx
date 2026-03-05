/**
 * AssetLanesView – Shows assets (boats/equipment) as rows with unavailability
 * backgrounds and session assignment blocks overlaid.
 */
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  resortId: string;
  date: string;
  onSessionClick: (sessionId: string) => void;
}

const HOUR_START = 6;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function timeToPercent(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const hours = h + m / 60;
  return Math.max(0, Math.min(100, ((hours - HOUR_START) / TOTAL_HOURS) * 100));
}

export function AssetLanesView({ resortId, date, onSessionClick }: Props) {
  // Assets
  const { data: assets = [] } = useQuery({
    queryKey: ['dept-asset-lanes', resortId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ops_assets')
        .select('id, name, type')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('type')
        .order('name');
      return (data ?? []) as { id: string; name: string; type: string }[];
    },
    enabled: !!resortId,
    staleTime: 60_000,
  });

  // Unavailability
  const { data: unavailability = [] } = useQuery({
    queryKey: ['dept-asset-unavailability', resortId, date],
    queryFn: async () => {
      const { data } = await supabase
        .from('asset_unavailability')
        .select('*')
        .eq('resort_id', resortId)
        .eq('unavailable_date', date);
      return data ?? [];
    },
    enabled: !!resortId && !!date,
    staleTime: 30_000,
  });

  // Asset assignments for sessions on this date
  const { data: assignments = [] } = useQuery({
    queryKey: ['dept-asset-assignments', resortId, date],
    queryFn: async () => {
      const { data } = await supabase
        .from('session_asset_assignments')
        .select(`
          id, asset_id, asset_label, asset_type,
          session:activity_sessions!inner(id, date, start_time, end_time, activity:activities(name))
        `)
        .eq('resort_id', resortId)
        .eq('session.date', date);
      return (data ?? []) as any[];
    },
    enabled: !!resortId && !!date,
    staleTime: 30_000,
  });

  const unavailByAsset = useMemo(() => {
    const map: Record<string, typeof unavailability> = {};
    for (const u of unavailability) map[u.asset_id] = [...(map[u.asset_id] ?? []), u];
    return map;
  }, [unavailability]);

  const assignmentsByAsset = useMemo(() => {
    const map: Record<string, typeof assignments> = {};
    for (const a of assignments) {
      if (a.asset_id) map[a.asset_id] = [...(map[a.asset_id] ?? []), a];
    }
    return map;
  }, [assignments]);

  if (assets.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No assets configured.
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

      {/* Asset lanes */}
      {assets.map(asset => {
        const assetUnavail = unavailByAsset[asset.id] ?? [];
        const assetAssignments = assignmentsByAsset[asset.id] ?? [];
        const isFullDayUnavail = assetUnavail.some(u => !u.start_time || !u.end_time);

        return (
          <div key={asset.id} className="flex items-stretch">
            <div className="w-28 shrink-0 py-2 pr-2 text-right">
              <p className="text-xs font-medium truncate">{asset.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{asset.type.toLowerCase()}</p>
            </div>
            <div className={cn(
              'flex-1 relative h-12 rounded border',
              isFullDayUnavail
                ? 'bg-destructive/5 border-destructive/20'
                : 'bg-muted/20 border-border/30'
            )}>
              {/* Full-day unavailability */}
              {isFullDayUnavail && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] text-destructive font-medium">
                  <Wrench className="h-3 w-3" />
                  Unavailable
                </div>
              )}

              {/* Timed unavailability */}
              {!isFullDayUnavail && assetUnavail.map(u => (
                u.start_time && u.end_time && (
                  <Tooltip key={u.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-0 bottom-0 bg-destructive/10 border-y border-destructive/20"
                        style={{
                          left: `${timeToPercent(u.start_time)}%`,
                          width: `${timeToPercent(u.end_time) - timeToPercent(u.start_time)}%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Unavailable {u.start_time.slice(0, 5)}–{u.end_time.slice(0, 5)}
                      {u.reason && <p className="text-muted-foreground">{u.reason}</p>}
                    </TooltipContent>
                  </Tooltip>
                )
              ))}

              {/* Session assignment blocks */}
              {!isFullDayUnavail && assetAssignments.map(a => {
                const s = a.session;
                if (!s) return null;
                const left = timeToPercent(s.start_time);
                const width = timeToPercent(s.end_time) - left;

                return (
                  <Tooltip key={a.id}>
                    <TooltipTrigger asChild>
                      <button
                        className="absolute top-1 bottom-1 rounded px-1 text-[10px] font-medium truncate cursor-pointer bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
                        style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                        onClick={() => onSessionClick(s.id)}
                      >
                        {s.activity?.name}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <p className="font-medium">{s.activity?.name}</p>
                      <p>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Hour grid lines */}
              {!isFullDayUnavail && Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-border/20"
                  style={{ left: `${((i + 1) / TOTAL_HOURS) * 100}%` }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
