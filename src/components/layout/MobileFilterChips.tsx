import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  active?: boolean;
  count?: number;
}

interface MobileFilterChipsProps {
  /** Array of filter chips to display */
  chips: FilterChip[];
  /** Called when a chip is clicked */
  onChipClick: (chipId: string) => void;
  /** Optional clear all action */
  onClearAll?: () => void;
  /** Show clear button when filters are active */
  showClear?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Horizontally scrollable filter chips for mobile list pages.
 * Provides quick access to common filters with touch-friendly targets.
 */
export function MobileFilterChips({
  chips,
  onChipClick,
  onClearAll,
  showClear = false,
  className,
}: MobileFilterChipsProps) {
  const hasActiveFilters = chips.some(chip => chip.active);

  return (
    <div className={cn("lg:hidden", className)}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 px-3 py-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => onChipClick(chip.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                "text-xs font-medium transition-all duration-150",
                "min-h-[32px] whitespace-nowrap",
                "border",
                chip.active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
              )}
            >
              {chip.label}
              {chip.count !== undefined && (
                <Badge
                  variant={chip.active ? "secondary" : "outline"}
                  className={cn(
                    "px-1.5 py-0 text-2xs font-medium",
                    chip.active && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {chip.count}
                </Badge>
              )}
            </button>
          ))}
          
          {showClear && hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 rounded-full",
                "text-xs font-medium text-destructive",
                "min-h-[32px] whitespace-nowrap",
                "border border-destructive/30 bg-destructive/10",
                "hover:bg-destructive/20 transition-colors"
              )}
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}

/**
 * Single-select filter chips that behave like radio buttons
 */
interface SingleSelectChipsProps<T extends string> {
  options: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function MobileSingleSelectChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: SingleSelectChipsProps<T>) {
  return (
    <MobileFilterChips
      chips={options.map(opt => ({
        id: opt.id,
        label: opt.label,
        count: opt.count,
        active: opt.id === value,
      }))}
      onChipClick={(id) => onChange(id as T)}
      className={className}
    />
  );
}
