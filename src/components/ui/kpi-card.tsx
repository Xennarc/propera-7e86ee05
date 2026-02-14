import { ReactNode, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// ─── KpiGrid ───────────────────────────────────────────────
// Responsive, centered grid container for KPI cards.
// Usage: <KpiGrid><KpiCard ... /><KpiCard ... /></KpiGrid>

type KpiGridMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type KpiGridSpacing = 'dense' | 'comfortable';

interface KpiGridProps {
  children: ReactNode;
  /** Max-width preset for the centered grid block */
  maxWidth?: KpiGridMaxWidth;
  /** Gap between cards */
  spacing?: KpiGridSpacing;
  /** Override responsive column config */
  columns?: string;
  className?: string;
}

const maxWidthMap: Record<KpiGridMaxWidth, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: '',
};

export function KpiGrid({
  children,
  maxWidth = 'lg',
  spacing = 'comfortable',
  columns,
  className,
}: KpiGridProps) {
  return (
    <div className="w-full flex justify-center">
      <div
        className={cn(
          'grid w-full',
          maxWidthMap[maxWidth],
          spacing === 'dense' ? 'gap-2 sm:gap-3' : 'gap-3 sm:gap-4',
          columns || 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ─── KpiCard ───────────────────────────────────────────────
// Standardized metric card with consistent spacing, alignment,
// loading, and empty states.

type KpiCardVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';
type KpiCardAlign = 'center' | 'left';

interface KpiCardProps {
  /** Label above the metric */
  label: string;
  /** Primary metric value */
  value: string | number;
  /** Lucide icon */
  icon?: LucideIcon;
  /** Trend / delta badge */
  delta?: {
    value: number;
    label?: string;
  };
  /** Supporting text below the value */
  helperText?: string;
  /** Color variant */
  variant?: KpiCardVariant;
  /** Content alignment */
  align?: KpiCardAlign;
  /** Show skeleton loader */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

const variantStyles: Record<KpiCardVariant, { icon: string; value: string }> = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    value: 'text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    value: 'text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
    value: 'text-destructive',
  },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  helperText,
  variant = 'default',
  align = 'center',
  loading = false,
  className,
}: KpiCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return <KpiSkeleton align={align} className={className} />;
  }

  const isCenter = align === 'center';

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        'motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
        'animate-fade-in',
        className,
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div
          className={cn(
            'flex gap-2',
            isCenter
              ? 'flex-col items-center justify-center text-center'
              : 'flex-row items-start',
          )}
        >
          {Icon && (
            <div className={cn('rounded-xl p-2.5 sm:p-3 shrink-0', styles.icon)}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}

          <div className={cn('space-y-0.5 sm:space-y-1 min-w-0', !isCenter && 'flex-1')}>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {label}
            </p>
            <p
              className={cn(
                'text-xl sm:text-2xl font-bold tracking-tight tabular-nums',
                styles.value,
              )}
            >
              {value === '' || value === null || value === undefined ? '—' : value}
            </p>
            {delta && (
              <p
                className={cn(
                  'text-[11px] sm:text-xs font-medium',
                  delta.value >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {delta.value >= 0 ? '+' : ''}
                {delta.value}%{delta.label ? ` ${delta.label}` : ''}
              </p>
            )}
            {helperText && (
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                {helperText}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── KpiSkeleton ───────────────────────────────────────────
// Visually matches KpiCard spacing to prevent layout shift.

interface KpiSkeletonProps {
  align?: KpiCardAlign;
  className?: string;
}

export const KpiSkeleton = memo(function KpiSkeleton({
  align = 'center',
  className,
}: KpiSkeletonProps) {
  const isCenter = align === 'center';

  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-4 sm:p-5">
        <div
          className={cn(
            'flex gap-2',
            isCenter
              ? 'flex-col items-center justify-center'
              : 'flex-row items-start',
          )}
        >
          <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0" />
          <div className={cn('space-y-2', isCenter ? 'flex flex-col items-center' : 'flex-1')}>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Migration TODO ────────────────────────────────────────
// Next dashboards to migrate to KpiGrid + KpiCard:
// TODO: src/pages/dashboards/SuperAdminHome.tsx (StatCard → KpiCard)
// TODO: src/pages/superadmin/SuperAdminDashboard.tsx (StatCard → KpiCard)
// TODO: src/pages/superadmin/ResortDetailPage.tsx (StatCard → KpiCard)
// TODO: src/components/transport/history/TransportMetricsCards.tsx (ReportStatCard → KpiCard)
// TODO: src/components/driver/DriverStatsSection.tsx (internal StatCard → KpiCard)
// TODO: src/pages/guests/GuestsPage.tsx (summary strip)
