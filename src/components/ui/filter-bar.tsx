import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-3 rounded-xl bg-muted/30 p-3 border border-border/50',
      className
    )}>
      {children}
    </div>
  );
}

interface FilterBarGroupProps {
  children: ReactNode;
  className?: string;
}

export function FilterBarGroup({ children, className }: FilterBarGroupProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

interface FilterBarSeparatorProps {
  className?: string;
}

export function FilterBarSeparator({ className }: FilterBarSeparatorProps) {
  return (
    <div className={cn('h-6 w-px bg-border hidden md:block', className)} />
  );
}
