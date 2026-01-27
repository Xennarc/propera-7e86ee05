import { cn } from '@/lib/utils';
import type { DashboardCounts } from '@/hooks/useRequestsDashboard';

export type StatusLane = 'new' | 'in_progress' | 'completed';

interface StatusLaneTabsProps {
  activeLane: StatusLane;
  onLaneChange: (lane: StatusLane) => void;
  counts: DashboardCounts;
}

const lanes: { key: StatusLane; label: string; countKey: keyof DashboardCounts }[] = [
  { key: 'new', label: 'New', countKey: 'new' },
  { key: 'in_progress', label: 'In Progress', countKey: 'inProgress' },
  { key: 'completed', label: 'Completed', countKey: 'completed' },
];

export function StatusLaneTabs({ activeLane, onLaneChange, counts }: StatusLaneTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
      {lanes.map((lane) => {
        const count = counts[lane.countKey];
        const isActive = activeLane === lane.key;
        const isNew = lane.key === 'new' && count > 0;

        return (
          <button
            key={lane.key}
            onClick={() => onLaneChange(lane.key)}
            className={cn(
              'relative flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              {lane.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full transition-colors',
                  isActive
                    ? isNew
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                    : 'bg-muted/50 text-muted-foreground',
                  isNew && !isActive && 'bg-primary/20 text-primary animate-pulse'
                )}
              >
                {count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
