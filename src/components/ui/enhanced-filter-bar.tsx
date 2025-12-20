import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnhancedFilterBarProps {
  children: ReactNode;
  className?: string;
}

export function EnhancedFilterBar({ children, className }: EnhancedFilterBarProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        {children}
      </div>
    </div>
  );
}

interface FilterGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function FilterGroup({ children, label, className }: FilterGroupProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

interface FilterSeparatorProps {
  className?: string;
}

export function FilterSeparator({ className }: FilterSeparatorProps) {
  return (
    <div className={cn('h-6 w-px bg-border hidden md:block', className)} />
  );
}

// Active filter chips display
interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFilters({ filters, onRemove, onClearAll, className }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 pt-2', className)}>
      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
      {filters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// Search with clear button
interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterSearch({ value, onChange, placeholder = 'Search...', className }: FilterSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'pr-8'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Quick action buttons strip
interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}

interface QuickActionsStripProps {
  actions: QuickActionProps[];
  className?: string;
}

export function QuickActionsStrip({ actions, className }: QuickActionsStripProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant === 'primary' ? 'default' : 'outline'}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          className="gap-1.5"
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
