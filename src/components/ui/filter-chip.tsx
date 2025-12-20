import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      'bg-primary/10 text-primary border border-primary/20',
      className
    )}>
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface FilterChipsContainerProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  className?: string;
}

export function FilterChipsContainer({ children, onClearAll, className }: FilterChipsContainerProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
      {onClearAll && (
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
