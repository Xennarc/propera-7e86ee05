import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Bento Grid - A modern asymmetric grid layout for KPI cards
 * Provides a mission-control style arrangement
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div 
      className={cn(
        'grid gap-3',
        // Mobile: 2 columns
        'grid-cols-2',
        // Tablet: 3 columns
        'md:grid-cols-3',
        // Desktop: 4 columns
        'lg:grid-cols-4',
        // Large desktop: 7 columns (1 row)
        'xl:grid-cols-7',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Bento Grid Item - Wrapper for controlling span
 */
interface BentoGridItemProps {
  children: ReactNode;
  span?: 1 | 2;
  className?: string;
}

export function BentoGridItem({ children, span = 1, className }: BentoGridItemProps) {
  return (
    <div 
      className={cn(
        span === 2 && 'col-span-2',
        className
      )}
    >
      {children}
    </div>
  );
}
