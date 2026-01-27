import { memo, useState } from 'react';
import { 
  LayoutGrid, 
  LayoutList,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  GuestStatusFilter, 
  GuestFlagFilter, 
  GuestSortOption,
  LegacyGuestFilter 
} from '@/hooks/useGuestFilters';
import { GuestListDensity } from '@/hooks/useGuestListPreferences';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { FilterSheet, FilterTrigger, FilterSection, FilterDivider } from '@/components/ui/filter-sheet';

interface GuestListToolbarProps {
  // Search
  search: string;
  onSearchChange: (value: string) => void;
  
  // Legacy filter dropdown
  legacyFilter: LegacyGuestFilter;
  onLegacyFilterChange: (value: LegacyGuestFilter) => void;
  
  // Multi-select filters
  statusFilters: GuestStatusFilter[];
  onStatusFiltersChange: (filters: GuestStatusFilter[]) => void;
  flagFilters: GuestFlagFilter[];
  onFlagFiltersChange: (filters: GuestFlagFilter[]) => void;
  
  // Sort
  sortBy: GuestSortOption;
  onSortChange: (value: GuestSortOption) => void;
  
  // Density
  density: GuestListDensity;
  onDensityToggle: () => void;
  
  // Prearrival visibility
  prearrivalEnabled: boolean;
  
  // Stats for filter counts
  stats?: {
    arriving72h?: number;
    prearrivalPending?: number;
    prearrivalCompleted?: number;
  };
  
  // Clear all
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  
  className?: string;
}

const STATUS_OPTIONS: { value: GuestStatusFilter; label: string }[] = [
  { value: 'pre-arrival', label: 'Pre-Arrival' },
  { value: 'arriving-today', label: 'Arriving Today' },
  { value: 'in-house', label: 'In-House' },
  { value: 'checking-out-today', label: 'Checking Out Today' },
  { value: 'checked-out', label: 'Checked Out' },
];

const FLAG_OPTIONS: { value: GuestFlagFilter; label: string }[] = [
  { value: 'vip', label: 'VIP' },
  { value: 'allergy', label: 'Allergies' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'occasion', label: 'Special Occasion' },
  { value: 'late-arrival', label: 'Late Arrival' },
];

const SORT_OPTIONS: { value: GuestSortOption; label: string }[] = [
  { value: 'arrival-asc', label: 'Arrival (Soonest)' },
  { value: 'arrival-desc', label: 'Arrival (Latest)' },
  { value: 'departure', label: 'Departure' },
  { value: 'room', label: 'Room Number' },
  { value: 'name', label: 'Name' },
  { value: 'vip-first', label: 'VIP First' },
];

export const GuestListToolbar = memo(function GuestListToolbar({
  search,
  onSearchChange,
  legacyFilter,
  onLegacyFilterChange,
  statusFilters,
  onStatusFiltersChange,
  flagFilters,
  onFlagFiltersChange,
  sortBy,
  onSortChange,
  density,
  onDensityToggle,
  prearrivalEnabled,
  stats,
  hasActiveFilters,
  onClearFilters,
  className,
}: GuestListToolbarProps) {
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const toggleStatusFilter = (filter: GuestStatusFilter) => {
    if (statusFilters.includes(filter)) {
      onStatusFiltersChange(statusFilters.filter(f => f !== filter));
    } else {
      onStatusFiltersChange([...statusFilters, filter]);
    }
  };

  const toggleFlagFilter = (filter: GuestFlagFilter) => {
    if (flagFilters.includes(filter)) {
      onFlagFiltersChange(flagFilters.filter(f => f !== filter));
    } else {
      onFlagFiltersChange([...flagFilters, filter]);
    }
  };

  const activeFilterCount = statusFilters.length + flagFilters.length;

  // Mobile: Compact search + filter trigger
  if (isMobile) {
    return (
      <>
        <div className={cn('flex gap-2', className)}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search..."
            className="flex-1"
          />
          <FilterTrigger
            onClick={() => setFilterSheetOpen(true)}
            activeCount={activeFilterCount}
          />
        </div>

        <FilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title="Guest Filters"
          activeCount={activeFilterCount}
          onClear={onClearFilters}
        >
          <FilterSection title="Quick Filter">
            <Select value={legacyFilter} onValueChange={(v) => onLegacyFilterChange(v as LegacyGuestFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guests</SelectItem>
                <SelectItem value="in-house">In-House</SelectItem>
                <SelectItem value="arrivals">Arrivals Today</SelectItem>
                <SelectItem value="departures">Departures Today</SelectItem>
              </SelectContent>
            </Select>
          </FilterSection>
          <FilterDivider />
          <FilterSection title="Status">
            <div className="space-y-2">
              {STATUS_OPTIONS.map(option => (
                <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Checkbox checked={statusFilters.includes(option.value)} onCheckedChange={() => toggleStatusFilter(option.value)} />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          <FilterDivider />
          <FilterSection title="Flags">
            <div className="space-y-2">
              {FLAG_OPTIONS.map(option => (
                <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Checkbox checked={flagFilters.includes(option.value)} onCheckedChange={() => toggleFlagFilter(option.value)} />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          <FilterDivider />
          <FilterSection title="Sort By">
            <Select value={sortBy} onValueChange={(v) => onSortChange(v as GuestSortOption)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterSection>
        </FilterSheet>
      </>
    );
  }

  // Desktop: Full inline toolbar
  return (
    <div className={cn('space-y-3', className)}>
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Legacy filter dropdown */}
        <Select value={legacyFilter} onValueChange={(v) => onLegacyFilterChange(v as LegacyGuestFilter)}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Guests</SelectItem>
            <SelectItem value="in-house">In-House</SelectItem>
            <SelectItem value="arrivals">Arrivals Today</SelectItem>
            <SelectItem value="departures">Departures Today</SelectItem>
            {prearrivalEnabled && (
              <>
                <SelectItem value="arriving-72h">
                  Arriving Next 72h {stats?.arriving72h ? `(${stats.arriving72h})` : ''}
                </SelectItem>
                <SelectItem value="prearrival-pending">
                  Pre-Arrival Incomplete
                </SelectItem>
                <SelectItem value="prearrival-completed">
                  Pre-Arrival Complete {stats?.prearrivalCompleted ? `(${stats.prearrivalCompleted})` : ''}
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {/* Search */}
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search name, room, email..."
          className="flex-1 min-w-[200px] max-w-sm"
        />

        {/* Advanced filters popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-4">
              {/* Status filters */}
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map(option => (
                    <label 
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={statusFilters.includes(option.value)}
                        onCheckedChange={() => toggleStatusFilter(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Flag filters */}
              <div>
                <p className="text-sm font-medium mb-2">Flags</p>
                <div className="space-y-2">
                  {FLAG_OPTIONS.map(option => (
                    <label 
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={flagFilters.includes(option.value)}
                        onCheckedChange={() => toggleFlagFilter(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as GuestSortOption)}>
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Density toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onDensityToggle}
              className="shrink-0"
            >
              {density === 'compact' ? (
                <LayoutList className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {density === 'compact' ? 'Switch to comfortable view' : 'Switch to compact view'}
          </TooltipContent>
        </Tooltip>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters chips */}
      {(statusFilters.length > 0 || flagFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active:</span>
          {statusFilters.map(filter => (
            <Badge
              key={filter}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleStatusFilter(filter)}
            >
              {STATUS_OPTIONS.find(o => o.value === filter)?.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {flagFilters.map(filter => (
            <Badge
              key={filter}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleFlagFilter(filter)}
            >
              {FLAG_OPTIONS.find(o => o.value === filter)?.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});
