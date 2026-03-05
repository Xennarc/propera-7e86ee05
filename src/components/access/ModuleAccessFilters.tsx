import { SearchInput } from '@/components/ui/search-input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ModuleFilter = 'all' | 'enabled' | 'restricted' | 'customized' | 'sensitive';

const FILTER_OPTIONS: { value: ModuleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'enabled', label: 'Enabled' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'customized', label: 'Customized' },
  { value: 'sensitive', label: 'Sensitive' },
];

interface ModuleAccessFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: ModuleFilter;
  onFilterChange: (filter: ModuleFilter) => void;
}

export function ModuleAccessFilters({ search, onSearchChange, filter, onFilterChange }: ModuleAccessFiltersProps) {
  return (
    <div className="space-y-2 py-2">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search modules…"
        debounceMs={200}
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onFilterChange(opt.value)}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
              'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              filter === opt.value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/40 text-muted-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
