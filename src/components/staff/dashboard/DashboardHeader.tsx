import { ReactNode } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  resortName: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Sticky dashboard header with current date and contextual quick actions.
 * Mobile-first with responsive text scaling.
 */
export function DashboardHeader({ resortName, actions, className }: DashboardHeaderProps) {
  const today = new Date();
  
  return (
    <header 
      className={cn(
        "sticky top-0 z-30 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 xl:-mx-10 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10",
        "pt-3 pb-4 sm:pt-4 sm:pb-5",
        "bg-background/95 backdrop-blur-sm border-b border-border/30",
        "transition-all duration-200",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title & Date */}
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {resortName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        {/* Quick Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
