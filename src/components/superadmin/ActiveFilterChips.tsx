import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsersFilter, DEFAULT_USERS_FILTER, getFilterLabel } from '@/hooks/superadmin/useUsersFilter';
import { cn } from '@/lib/utils';

interface Resort {
  id: string;
  name: string;
}

interface ActiveFilterChipsProps {
  filter: UsersFilter;
  onFilterChange: (updates: Partial<UsersFilter>) => void;
  onReset: () => void;
  resorts: Resort[];
  className?: string;
}

interface FilterChip {
  key: keyof UsersFilter;
  label: string;
  value: string;
}

export function ActiveFilterChips({
  filter,
  onFilterChange,
  onReset,
  resorts,
  className,
}: ActiveFilterChipsProps) {
  const chips: FilterChip[] = [];

  // Build chips from active filters
  if (filter.status !== 'all') {
    const label = getFilterLabel('status', filter.status);
    if (label) chips.push({ key: 'status', label: 'Status', value: label });
  }

  if (filter.globalRole !== 'all') {
    const label = getFilterLabel('globalRole', filter.globalRole);
    if (label) chips.push({ key: 'globalRole', label: 'Role', value: label });
  }

  if (filter.resortId !== 'all') {
    const resort = resorts.find((r) => r.id === filter.resortId);
    if (resort) chips.push({ key: 'resortId', label: 'Resort', value: resort.name });
  }

  if (filter.resortRole !== 'all') {
    const label = getFilterLabel('resortRole', filter.resortRole);
    if (label) chips.push({ key: 'resortRole', label: 'Resort Role', value: label });
  }

  if (filter.access !== 'any') {
    const label = getFilterLabel('access', filter.access);
    if (label) chips.push({ key: 'access', label: 'Access', value: label });
  }

  if (filter.multiResortOnly) {
    chips.push({ key: 'multiResortOnly', label: '', value: 'Multi-resort' });
  }

  if (filter.joinedFrom) {
    chips.push({ key: 'joinedFrom', label: 'From', value: filter.joinedFrom });
  }

  if (filter.joinedTo) {
    chips.push({ key: 'joinedTo', label: 'To', value: filter.joinedTo });
  }

  if (chips.length === 0) return null;

  const handleRemove = (key: keyof UsersFilter) => {
    const defaultValue = DEFAULT_USERS_FILTER[key];
    onFilterChange({ [key]: defaultValue });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          {chip.label && (
            <span className="text-muted-foreground">{chip.label}:</span>
          )}
          <span>{chip.value}</span>
          <button
            type="button"
            onClick={() => handleRemove(chip.key)}
            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${chip.label || chip.value} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
