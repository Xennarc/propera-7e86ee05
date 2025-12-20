import { cn } from '@/lib/utils';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';

export type DatePreset = 'today' | 'tomorrow' | 'this-week' | 'next-7-days' | 'next-30-days' | 'custom';

interface DateFilterChipsProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
  showCustom?: boolean;
  className?: string;
}

export function DateFilterChips({
  value,
  onChange,
  onDateRangeChange,
  showCustom = false,
  className,
}: DateFilterChipsProps) {
  const presets: { key: DatePreset; label: string; getRange: () => [Date, Date] }[] = [
    {
      key: 'today',
      label: 'Today',
      getRange: () => {
        const today = new Date();
        return [today, today];
      },
    },
    {
      key: 'tomorrow',
      label: 'Tomorrow',
      getRange: () => {
        const tomorrow = addDays(new Date(), 1);
        return [tomorrow, tomorrow];
      },
    },
    {
      key: 'this-week',
      label: 'This Week',
      getRange: () => {
        const today = new Date();
        return [startOfWeek(today, { weekStartsOn: 1 }), endOfWeek(today, { weekStartsOn: 1 })];
      },
    },
    {
      key: 'next-7-days',
      label: 'Next 7 Days',
      getRange: () => {
        const today = new Date();
        return [today, addDays(today, 7)];
      },
    },
    {
      key: 'next-30-days',
      label: 'Next 30 Days',
      getRange: () => {
        const today = new Date();
        return [today, addDays(today, 30)];
      },
    },
  ];

  const handleClick = (preset: (typeof presets)[number]) => {
    onChange(preset.key);
    if (onDateRangeChange) {
      const [start, end] = preset.getRange();
      onDateRangeChange(start, end);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {presets.map((preset) => (
        <button
          key={preset.key}
          type="button"
          onClick={() => handleClick(preset)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full transition-all',
            'border border-border/50 hover:border-primary/50',
            value === preset.key
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background hover:bg-muted/50'
          )}
        >
          {preset.label}
        </button>
      ))}
      {showCustom && (
        <button
          type="button"
          onClick={() => onChange('custom')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full transition-all',
            'border border-border/50 hover:border-primary/50',
            value === 'custom'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background hover:bg-muted/50'
          )}
        >
          Custom
        </button>
      )}
    </div>
  );
}

// Status filter chips
export type StatusOption = {
  key: string;
  label: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

interface StatusFilterChipsProps {
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
}

export function StatusFilterChips({
  options,
  value,
  onChange,
  allowAll = true,
  allLabel = 'All',
  className,
}: StatusFilterChipsProps) {
  const allOptions = allowAll ? [{ key: 'all', label: allLabel }, ...options] : options;

  const getColorClass = (option: StatusOption, isActive: boolean) => {
    if (!isActive) return 'bg-background hover:bg-muted/50';
    
    switch (option.color) {
      case 'success':
        return 'bg-success/10 text-success border-success/30';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'danger':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'info':
        return 'bg-primary/10 text-primary border-primary/30';
      default:
        return 'bg-primary text-primary-foreground border-primary';
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {allOptions.map((option) => {
        const isActive = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full transition-all',
              'border border-border/50',
              getColorClass(option as StatusOption, isActive)
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
