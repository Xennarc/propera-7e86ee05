import * as React from 'react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from './page-header';
import { FilterBar } from './filter-bar';
import { Card, CardContent } from './card';
import { LucideIcon } from 'lucide-react';

interface StaffPageLayoutProps {
  /** Page title */
  title: string;
  /** Optional page description */
  description?: string;
  /** Primary action button (top-right) */
  action?: ReactNode;
  /** Back button element */
  backButton?: ReactNode;
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Filter bar content */
  filters?: ReactNode;
  /** Active filter chips shown below filter bar */
  activeFilters?: ReactNode;
  /** Main page content */
  children: ReactNode;
  /** Optional right sidebar content */
  aside?: ReactNode;
  /** Additional className for the main content area */
  className?: string;
  /** Whether to use full width (no aside) */
  fullWidth?: boolean;
}

export function StaffPageLayout({
  title,
  description,
  action,
  backButton,
  breadcrumbs,
  filters,
  activeFilters,
  children,
  aside,
  className,
  fullWidth = false,
}: StaffPageLayoutProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={title}
        description={description}
        action={action}
        backButton={backButton}
        breadcrumbs={breadcrumbs}
      />

      {/* Filters */}
      {filters && (
        <div className="space-y-3">
          <FilterBar>{filters}</FilterBar>
          {activeFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {aside && !fullWidth ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
          <div className={cn("space-y-6 min-w-0", className)}>
            {children}
          </div>
          <aside className="hidden lg:block space-y-4">
            {aside}
          </aside>
        </div>
      ) : (
        <div className={cn("space-y-6", className)}>
          {children}
        </div>
      )}
    </div>
  );
}

interface ContextPanelProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function ContextPanel({ title, icon: Icon, children, className }: ContextPanelProps) {
  return (
    <Card className={cn("sticky top-6", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

interface QuickTipProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function QuickTip({ title, description, icon: Icon }: QuickTipProps) {
  return (
    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
      <div className="flex items-start gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}
