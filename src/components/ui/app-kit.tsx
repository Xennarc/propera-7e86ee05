/**
 * App UI Kit — Standardized reusable primitives across Guest, Staff, and Dept portals.
 *
 * Wraps existing shadcn/Tailwind primitives with consistent recipes.
 * No layout changes — only style consistency.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

/* ═══════════════════════════════════════════
   AppCard — Surface container with elevation
   ═══════════════════════════════════════════ */

type AppCardVariant = 'default' | 'elevated' | 'interactive' | 'inset';

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AppCardVariant;
}

const cardVariants: Record<AppCardVariant, string> = {
  default: 'bg-card rounded-2xl border border-border/40 shadow-card',
  elevated: 'staff-card-elevated',
  interactive:
    'bg-card rounded-2xl border border-border/40 shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-border/60 active:scale-[0.995]',
  inset: 'bg-muted/30 rounded-2xl border border-border/20',
};

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants[variant], className)} {...props}>
      {children}
    </div>
  ),
);
AppCard.displayName = 'AppCard';

export function AppCardBody({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
}

/* ═══════════════════════════════════════════
   AppSection — Semantic content grouping
   ═══════════════════════════════════════════ */

interface AppSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  /** Remove the bottom spacing */
  flush?: boolean;
}

export function AppSection({
  title,
  subtitle,
  icon: Icon,
  action,
  flush,
  className,
  children,
  ...props
}: AppSectionProps) {
  return (
    <section className={cn(!flush && 'space-y-4', className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ═══════════════════════════════════════════
   AppToolbar — Page-level toolbar (title + actions + optional search)
   ═══════════════════════════════════════════ */

interface AppToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: React.ReactNode;
}

export function AppToolbar({
  title,
  subtitle,
  onRefresh,
  refreshing,
  actions,
  className,
  children,
  ...props
}: AppToolbarProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)} {...props}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AppFilterBar — Chip row for filter/search
   ═══════════════════════════════════════════ */

interface AppFilterBarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AppFilterBar({ className, children, ...props }: AppFilterBarProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)} {...props}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AppEmptyState — Consistent empty/zero state
   ═══════════════════════════════════════════ */

interface AppEmptyStateProps {
  icon?: LucideIcon;
  message: string;
  submessage?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AppEmptyState({ icon: Icon, message, submessage, action, className }: AppEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center animate-fade-in', className)}>
      {Icon && (
        <div className="rounded-full bg-muted/50 p-3 mb-3">
          <Icon className="h-7 w-7 text-muted-foreground/50" />
        </div>
      )}
      <p className="text-sm text-muted-foreground">{message}</p>
      {submessage && <p className="text-xs text-muted-foreground/70 mt-1">{submessage}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AppBanner — Info/Warning/Error banners
   ═══════════════════════════════════════════ */

type AppBannerVariant = 'info' | 'warning' | 'success' | 'error';

interface AppBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AppBannerVariant;
  icon?: LucideIcon;
  title?: string;
  /** If provided, the banner has a dismiss button */
  onDismiss?: () => void;
}

const bannerStyles: Record<AppBannerVariant, string> = {
  info: 'bg-primary/5 border-primary/20 text-foreground',
  warning: 'bg-warning/10 border-warning/20 text-foreground',
  success: 'bg-success/10 border-success/20 text-foreground',
  error: 'bg-destructive/10 border-destructive/20 text-foreground',
};

const bannerIconColors: Record<AppBannerVariant, string> = {
  info: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  error: 'text-destructive',
};

export function AppBanner({
  variant = 'info',
  icon: Icon,
  title,
  onDismiss,
  className,
  children,
  ...props
}: AppBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border text-sm',
        bannerStyles[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', bannerIconColors[variant])} />}
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm">{title}</p>}
        {children && <div className="text-sm text-muted-foreground mt-0.5">{children}</div>}
      </div>
      {onDismiss && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
          ×
        </Button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AppTimeBlock — Grouped section with label (for ops)
   ═══════════════════════════════════════════ */

interface AppTimeBlockProps {
  label: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}

export function AppTimeBlock({ label, count, children, className }: AppTimeBlockProps) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {label}{count != null ? ` · ${count}` : ''}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
