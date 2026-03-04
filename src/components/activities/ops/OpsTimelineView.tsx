/**
 * OpsTimelineView – Vertical timeline showing sessions proportional to duration.
 * Tap a block to open the Run Sheet. Warning markers for blockers.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusChip } from '@/components/ui/status-chip';
import { AlertTriangle, Users, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpsSessionRow } from '@/hooks/useDailyOpsSheet';

interface OpsTimelineViewProps {
  rows: OpsSessionRow[];
  dateStr: string;
}

// Timeline runs from 06:00 to 22:00 (16 hours)
const TIMELINE_START = 6; // 6 AM
const TIMELINE_END = 22; // 10 PM
const TOTAL_MINUTES = (TIMELINE_END - TIMELINE_START) * 60;
const PX_PER_MIN = 3; // 3px per minute → 2880px total height
const HOUR_MARKS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

function timeToMinutes(time: string): number {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function OpsTimelineView({ rows, dateStr }: OpsTimelineViewProps) {
  const navigate = useNavigate();

  // Position each session block
  const blocks = useMemo(() => {
    return rows.map(row => {
      const startMin = timeToMinutes(row.start_time) - TIMELINE_START * 60;
      const endMin = timeToMinutes(row.end_time) - TIMELINE_START * 60;
      const duration = Math.max(endMin - startMin, 20); // min 20 min visual height
      const top = Math.max(startMin, 0) * PX_PER_MIN;
      const height = Math.max(duration * PX_PER_MIN, 60); // min 60px
      const hasBlockers = row.blockers.length > 0 || row.conflicts_count > 0;
      return { ...row, top, height, hasBlockers };
    });
  }, [rows]);

  // Detect overlaps for side-by-side layout
  const positioned = useMemo(() => {
    const sorted = [...blocks].sort((a, b) => a.top - b.top);
    const columns: Array<{ endY: number }> = [];

    return sorted.map(block => {
      let col = 0;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].endY <= block.top) {
          col = i;
          break;
        }
        col = i + 1;
      }
      if (col >= columns.length) {
        columns.push({ endY: block.top + block.height });
      } else {
        columns[col].endY = block.top + block.height;
      }
      const totalCols = Math.max(columns.length, 1);
      return { ...block, col, totalCols };
    });
  }, [blocks]);

  const totalHeight = TOTAL_MINUTES * PX_PER_MIN;

  return (
    <div className="relative overflow-x-hidden overflow-y-auto px-4 py-2">
      <div className="relative" style={{ height: totalHeight, minWidth: 280 }}>
        {/* Hour gridlines */}
        {HOUR_MARKS.map(h => {
          const y = (h - TIMELINE_START) * 60 * PX_PER_MIN;
          return (
            <div key={h} className="absolute left-0 right-0" style={{ top: y }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium w-12 shrink-0 text-right tabular-nums">
                  {formatHour(h)}
                </span>
                <div className="flex-1 border-t border-border/30" />
              </div>
            </div>
          );
        })}

        {/* Session blocks */}
        {positioned.map(block => {
          const widthPct = 100 / Math.max(block.totalCols, 1);
          const leftPct = block.col * widthPct;

          return (
            <button
              key={block.session_id}
              onClick={() => navigate(`/staff/activities/sessions/${block.session_id}/ops`)}
              className={cn(
                'absolute rounded-xl border p-2.5 text-left transition-colors overflow-hidden',
                'hover:ring-2 hover:ring-primary/30',
                block.hasBlockers
                  ? 'border-warning/50 bg-warning/5'
                  : 'border-border/50 bg-card',
              )}
              style={{
                top: block.top,
                height: block.height,
                left: `calc(52px + ${leftPct}% * 0.92)`,
                width: `calc(${widthPct}% * 0.88)`,
                maxWidth: 'calc(100% - 60px)',
              }}
            >
              {/* Time */}
              <p className="text-[10px] font-semibold text-primary tabular-nums">
                {block.start_time?.slice(0, 5)}–{block.end_time?.slice(0, 5)}
              </p>

              {/* Name */}
              <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                {block.activity_name}
              </p>

              {/* Compact meta */}
              {block.height >= 80 && (
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {block.total_pax}/{block.capacity}
                  </span>
                  {block.assignments.boat && (
                    <span className="flex items-center gap-0.5 truncate">
                      <Ship className="h-3 w-3" />
                      {block.assignments.boat.name}
                    </span>
                  )}
                </div>
              )}

              {/* Status + blockers */}
              {block.height >= 100 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StatusChip status={block.status} />
                  {block.hasBlockers && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-warning font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {block.conflicts_count > 0 && `${block.conflicts_count} conflict`}
                      {block.blockers.length > 0 && (block.conflicts_count > 0 ? ' · ' : '') + `${block.blockers.reduce((s, b) => s + b.count, 0)} blocker`}
                    </span>
                  )}
                </div>
              )}

              {/* Minimal blocker marker for small blocks */}
              {block.height < 100 && block.hasBlockers && (
                <AlertTriangle className="absolute top-2 right-2 h-3.5 w-3.5 text-warning" />
              )}
            </button>
          );
        })}

        {/* "Now" line */}
        <NowLine />
      </div>
    </div>
  );
}

function NowLine() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() - TIMELINE_START * 60;
  if (nowMin < 0 || nowMin > TOTAL_MINUTES) return null;
  const y = nowMin * PX_PER_MIN;

  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: y }}>
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-destructive shrink-0 ml-10" />
        <div className="flex-1 border-t-2 border-destructive/60 border-dashed" />
      </div>
    </div>
  );
}
