import * as React from 'react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffPageLayoutProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Primary action button */
  action?: ReactNode;
  /** Filter bar content */
  filters?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Standard page template for all staff pages.
 * Provides consistent layout: Title row, filter row, content area.
 */
export function StaffPageLayout({
  title,
  description,
  action,
  filters,
  children,
  loading,
  className,
}: StaffPageLayoutProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* Filter Row */}
      {filters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[200px]">
        {loading ? (
          <PageSkeleton />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="bg-muted/30 p-4 border-b border-border/30">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="divide-y divide-border/30">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Minimal stats bar
interface StatsBarProps {
  stats: Array<{
    label: string;
    value: string | number;
  }>;
  className?: string;
}

export function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-6 py-2', className)}>
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
          <span className="text-sm text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

// Segmented control for switching views
interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function SegmentedControl({ value, onChange, options, className }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex p-0.5 rounded-lg bg-muted/50 border border-border/50', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Minimal content card
interface ContentCardProps {
  children: ReactNode;
  className?: string;
}

export function ContentCard({ children, className }: ContentCardProps) {
  return (
    <div className={cn('rounded-lg border border-border/50 bg-card overflow-hidden', className)}>
      {children}
    </div>
  );
}

// Card header for tables
interface ContentCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ContentCardHeader({ children, className }: ContentCardHeaderProps) {
  return (
    <div className={cn('p-4 border-b border-border/30 bg-muted/20', className)}>
      {children}
    </div>
  );
}
