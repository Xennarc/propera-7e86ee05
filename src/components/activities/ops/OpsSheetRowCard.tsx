/**
 * OpsSheetRowCard – Single session row in the Master Ops Sheet.
 * radius 16, padding 16, gap 12, min-height ~104.
 * Badges are clickable deep links to the Run Sheet with filter params.
 */
import { useNavigate } from 'react-router-dom';
import { StatusChip } from '@/components/ui/status-chip';
import { Badge } from '@/components/ui/badge';
import {
  Ship,
  Users,
  Anchor,
  AlertTriangle,
  ChevronRight,
  Bus,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpsSessionRow } from '@/hooks/useDailyOpsSheet';

interface OpsSheetRowCardProps {
  row: OpsSessionRow;
}

export function OpsSheetRowCard({ row }: OpsSheetRowCardProps) {
  const navigate = useNavigate();

  const hasBlockers = row.blockers.length > 0;
  const hasConflicts = row.conflicts_count > 0;

  const baseUrl = `/staff/activities/sessions/${row.session_id}/ops`;

  const handleCardClick = () => navigate(baseUrl);

  // Deep link handlers — stop propagation so card click doesn't fire
  const handleCertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${baseUrl}?manifest_filter=unverified_cert`);
  };

  const handleMedicalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${baseUrl}?open_medical=1`);
  };

  const handleConflictClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${baseUrl}?open_conflicts=1`);
  };

  return (
    <button
      onClick={handleCardClick}
      className={cn(
        'w-full text-left rounded-2xl border border-border/40 bg-card p-4 space-y-3 transition-colors hover:bg-accent/5 min-h-[104px]',
        hasConflicts && 'border-warning/40',
      )}
    >
      {/* Header: time + name + status */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary tabular-nums shrink-0">
              {row.start_time?.slice(0, 5)}–{row.end_time?.slice(0, 5)}
            </span>
            <StatusChip status={row.status} />
          </div>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">
            {row.activity_name}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
      </div>

      {/* Meta: location + pax */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {row.location && (
          <span className="flex items-center gap-1 truncate">
            <Anchor className="h-3 w-3 shrink-0" />
            {row.location}
          </span>
        )}
        <span className="flex items-center gap-1 shrink-0 ml-auto">
          <Users className="h-3 w-3" />
          <span className="font-medium text-foreground">{row.total_pax}</span>/{row.capacity}
        </span>
      </div>

      {/* Readiness line */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
          <span className="text-success font-medium">{row.readiness.ready} Ready</span>
        </span>
        {row.readiness.missing > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
            <span className="text-warning font-medium">{row.readiness.missing} Missing</span>
          </span>
        )}
        {row.readiness.pending_medical > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
            <span className="text-warning font-medium">{row.readiness.pending_medical} Review</span>
          </span>
        )}
      </div>

      {/* Assignment chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Boat */}
        {row.assignments.boat ? (
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-border/60">
            <Ship className="h-3 w-3" />
            {row.assignments.boat.name}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-border/40 text-muted-foreground">
            <Ship className="h-3 w-3" />
            No boat
          </Badge>
        )}

        {/* Crew */}
        {row.assignments.crew.length > 0 && (
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-border/60">
            <Users className="h-3 w-3" />
            {row.assignments.crew.length} crew
          </Badge>
        )}

        {/* Equipment count */}
        {row.assignments.equipment.length > 0 && (
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-border/60">
            {row.assignments.equipment.length} equip
          </Badge>
        )}

        {/* Pickup */}
        {row.pickup && (
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-primary/40 text-primary">
            <Bus className="h-3 w-3" />
            {row.pickup.status === 'completed' ? 'Picked up' : row.pickup.has_driver ? 'Driver assigned' : 'Pickup planned'}
          </Badge>
        )}

        {/* Conflicts warning — clickable deep link */}
        {hasConflicts && (
          <Badge
            variant="outline"
            className="text-[10px] py-0.5 px-2 gap-1 border-warning/40 text-warning bg-warning/10 cursor-pointer hover:bg-warning/20 transition-colors"
            onClick={handleConflictClick}
          >
            <AlertTriangle className="h-3 w-3" />
            {row.conflicts_count} conflict{row.conflicts_count !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Blockers summary — clickable deep links */}
      {hasBlockers && (
        <div className="flex flex-wrap gap-1.5">
          {row.blockers.map((b, i) => {
            const isCert = b.type === 'unverified_cert';
            return (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] py-0.5 px-2 gap-1 border-destructive/30 text-destructive bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={isCert ? handleCertClick : handleMedicalClick}
              >
                {isCert ? <ShieldAlert className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                {isCert
                  ? `${b.count} unverified cert${b.count !== 1 ? 's' : ''}`
                  : `${b.count} medical pending`}
              </Badge>
            );
          })}
        </div>
      )}
    </button>
  );
}

export function OpsSheetRowCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3 animate-pulse min-h-[104px]">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-16 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-36 rounded bg-muted" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-12 rounded bg-muted ml-auto" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-14 rounded-full bg-muted" />
        <div className="h-5 w-14 rounded-full bg-muted" />
      </div>
    </div>
  );
}
