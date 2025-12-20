import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkbenchLayoutProps {
  children: ReactNode;
  filters?: ReactNode;
  stats?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function WorkbenchLayout({
  children,
  filters,
  stats,
  title,
  description,
  action,
  className,
}: WorkbenchLayoutProps) {
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* Header */}
      {(title || action) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      {/* Stats Row */}
      {stats && <div className="animate-fade-in">{stats}</div>}

      {/* Main Content Card */}
      <Card className="overflow-hidden">
        {/* Filters Section */}
        {filters && (
          <div className="border-b border-border/50 p-4 bg-muted/20">
            {filters}
          </div>
        )}

        {/* Content Section */}
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  );
}

// Context drawer for detail views without navigation
interface ContextDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function ContextDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ContextDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/50 mb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle>{title}</SheetTitle>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1">{children}</div>
        {footer && (
          <div className="mt-6 pt-4 border-t border-border/50">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Stats grid with consistent styling
interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Quick stat card for workbench headers
interface QuickStatProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function QuickStat({ label, value, variant = 'default', className }: QuickStatProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
        variant === 'default' && 'bg-muted/50',
        variant === 'success' && 'bg-success/10 text-success',
        variant === 'warning' && 'bg-warning/10 text-warning',
        variant === 'danger' && 'bg-destructive/10 text-destructive',
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
