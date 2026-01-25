import { memo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  CalendarClock,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LegacyGuestFilter } from '@/hooks/useGuestFilters';

interface GuestStats {
  total: number;
  inHouse: number;
  arrivingToday: number;
  departingToday: number;
  preArrivals: number;
  vips: number;
}

interface GuestsSummaryStripProps {
  stats: GuestStats;
  activeFilter: LegacyGuestFilter;
  onFilterChange: (filter: LegacyGuestFilter) => void;
  className?: string;
}

interface StatChip {
  key: LegacyGuestFilter;
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  activeClass: string;
}

export const GuestsSummaryStrip = memo(function GuestsSummaryStrip({
  stats,
  activeFilter,
  onFilterChange,
  className,
}: GuestsSummaryStripProps) {
  const chips: StatChip[] = [
    {
      key: 'arrivals',
      label: 'Arriving Today',
      value: stats.arrivingToday,
      icon: ArrowUpRight,
      colorClass: 'text-success',
      activeClass: 'ring-success/30 bg-success/10',
    },
    {
      key: 'in-house',
      label: 'In-House',
      value: stats.inHouse,
      icon: Building2,
      colorClass: 'text-primary',
      activeClass: 'ring-primary/30 bg-primary/10',
    },
    {
      key: 'departures',
      label: 'Departing Today',
      value: stats.departingToday,
      icon: ArrowDownRight,
      colorClass: 'text-warning',
      activeClass: 'ring-warning/30 bg-warning/10',
    },
    {
      key: 'all',
      label: 'Pre-Arrivals',
      value: stats.preArrivals,
      icon: CalendarClock,
      colorClass: 'text-muted-foreground',
      activeClass: 'ring-border bg-muted',
    },
    {
      key: 'all',
      label: 'VIPs',
      value: stats.vips,
      icon: Crown,
      colorClass: 'text-amber-500',
      activeClass: 'ring-amber-500/30 bg-amber-500/10',
    },
  ];

  // Click handler for VIP filter
  const handleClick = (chip: StatChip) => {
    if (chip.label === 'VIPs') {
      // Toggle VIP flag filter (handled separately)
      onFilterChange(activeFilter === 'all' ? 'all' : 'all');
    } else if (chip.label === 'Pre-Arrivals') {
      onFilterChange('prearrival-pending');
    } else {
      onFilterChange(activeFilter === chip.key ? 'all' : chip.key);
    }
  };

  return (
    <div 
      className={cn(
        'flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1',
        className
      )}
    >
      {chips.map((chip, index) => {
        const Icon = chip.icon;
        const isActive = 
          (chip.key === activeFilter) ||
          (chip.label === 'Pre-Arrivals' && activeFilter === 'prearrival-pending');
        
        return (
          <button
            key={`${chip.key}-${index}`}
            onClick={() => handleClick(chip)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
              'snap-start shrink-0',
              isActive
                ? cn('ring-2', chip.activeClass)
                : 'bg-card border-border hover:border-border/80'
            )}
          >
            <Icon className={cn('h-4 w-4', chip.colorClass)} />
            <span className="text-sm font-medium whitespace-nowrap">{chip.label}</span>
            <span className={cn(
              'text-sm font-semibold tabular-nums min-w-[1.5rem] text-center',
              chip.colorClass
            )}>
              {chip.value}
            </span>
          </button>
        );
      })}
    </div>
  );
});
