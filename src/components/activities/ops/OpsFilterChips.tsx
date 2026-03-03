/**
 * OpsFilterChips – Horizontal scrollable filter chips for Master Ops Sheet.
 */
import { cn } from '@/lib/utils';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  Stethoscope,
  Bus,
  Flame,
  LayoutList,
} from 'lucide-react';
import type { OpsSheetSummary } from '@/hooks/useDailyOpsSheet';

export type OpsFilter =
  | 'all'
  | 'starting_soon'
  | 'missing'
  | 'certs'
  | 'medical'
  | 'pickup'
  | 'conflicts';

interface FilterDef {
  key: OpsFilter;
  label: string;
  icon: React.ElementType;
  getBadge: (s: OpsSheetSummary | undefined) => number | null;
  color: string; // active bg color token
}

const FILTERS: FilterDef[] = [
  { key: 'all', label: 'All', icon: LayoutList, getBadge: (s) => s?.sessions ?? null, color: 'bg-primary' },
  { key: 'starting_soon', label: 'Starting Soon', icon: Clock, getBadge: () => null, color: 'bg-primary' },
  { key: 'missing', label: 'Missing Prep', icon: Flame, getBadge: (s) => s?.missing_readiness || null, color: 'bg-warning' },
  { key: 'certs', label: 'Unverified Certs', icon: ShieldAlert, getBadge: (s) => s?.unverified_certs || null, color: 'bg-destructive' },
  { key: 'medical', label: 'Pending Medical', icon: Stethoscope, getBadge: (s) => s?.pending_medical || null, color: 'bg-amber-600' },
  { key: 'pickup', label: 'Needs Pickup', icon: Bus, getBadge: (s) => s?.pickups_required || null, color: 'bg-primary' },
  { key: 'conflicts', label: 'Conflicts', icon: AlertTriangle, getBadge: (s) => s?.conflicts || null, color: 'bg-destructive' },
];

interface OpsFilterChipsProps {
  activeFilter: OpsFilter;
  onChange: (f: OpsFilter) => void;
  summary?: OpsSheetSummary;
}

export function OpsFilterChips({ activeFilter, onChange, summary }: OpsFilterChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 py-2">
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.key;
        const badge = f.getBadge(summary);
        const Icon = f.icon;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key === activeFilter ? 'all' : f.key)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap border',
              isActive
                ? `${f.color} text-primary-foreground border-transparent`
                : 'bg-card border-border/40 text-muted-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {f.label}
            {badge != null && badge > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold leading-none',
                  isActive
                    ? 'bg-background/20 text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
