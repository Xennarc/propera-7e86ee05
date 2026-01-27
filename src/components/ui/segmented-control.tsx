import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: ReactNode;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  size?: 'sm' | 'default';
}

/**
 * iOS/Android-style segmented control with native feel.
 * Designed for mobile-first use cases like status lanes.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'default',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex p-1 rounded-xl bg-muted/60 backdrop-blur-sm',
        'border border-border/50',
        className
      )}
      role="tablist"
      aria-orientation="horizontal"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              // Base styles
              'relative flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200',
              // Touch target - minimum 44px height
              size === 'sm' ? 'min-h-[36px] px-3 text-xs' : 'min-h-[44px] px-4 text-sm',
              // Active state
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              // Focus ring
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1'
            )}
          >
            {option.icon && (
              <span className={cn('shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')}>
                {option.icon}
              </span>
            )}
            <span className="sm:hidden whitespace-nowrap">{option.shortLabel || option.label}</span>
            <span className="hidden sm:inline whitespace-nowrap">{option.label}</span>
            {option.count !== undefined && option.count > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'font-semibold',
                  size === 'sm' ? 'h-4 min-w-4 px-1 text-[9px]' : 'h-5 min-w-5 px-1.5 text-[10px]',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted-foreground/15 text-muted-foreground'
                )}
              >
                {option.count > 99 ? '99+' : option.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
