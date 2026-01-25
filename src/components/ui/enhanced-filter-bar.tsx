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
      {/* Mobile: stack vertically with full-width items, Desktop: horizontal row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
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
    <div className={cn('relative w-full sm:w-auto', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          // Mobile: 48px height for touch, desktop: 36px
          'h-12 sm:h-9 w-full sm:w-64 rounded-xl border border-input bg-background px-4 sm:px-3 py-3 sm:py-1 text-base sm:text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'pr-10 sm:pr-8'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 sm:right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
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
