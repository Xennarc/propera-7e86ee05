import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Search, 
  X, 
  Filter,
  Star,
} from 'lucide-react';
import type { TransportHistoryFilters } from '@/hooks/transport/useTransportHistory';
import type { BuggyRow } from '@/hooks/transport/useBuggies';

interface HistoryFilterBarProps {
  filters: TransportHistoryFilters;
  onFiltersChange: (filters: TransportHistoryFilters) => void;
  zones: string[];
  drivers: Array<{ user_id: string; display_name: string }>;
  buggies: BuggyRow[];
  mode: 'requests' | 'trips';
}

export function HistoryFilterBar({
  filters,
  onFiltersChange,
  zones,
  drivers,
  buggies,
  mode,
}: HistoryFilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery || '');
  
  const updateFilter = <K extends keyof TransportHistoryFilters>(
    key: K, 
    value: TransportHistoryFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  
  const clearFilter = (key: keyof TransportHistoryFilters) => {
    const updated = { ...filters };
    delete updated[key];
    onFiltersChange(updated);
  };
  
  const handleSearchSubmit = () => {
    updateFilter('searchQuery', searchValue || undefined);
  };
  
  const activeFilterCount = [
    filters.status,
    filters.isVip,
    filters.zoneId,
    filters.driverId,
    filters.buggyId,
    filters.searchQuery,
  ].filter(Boolean).length;
  
  return (
    <div className="space-y-3">
      {/* Main filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal h-10 sm:h-9 w-full sm:w-auto',
                !filters.dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(filters.dateRange.from, 'MMM d')} – {format(filters.dateRange.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange.from}
              selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  updateFilter('dateRange', { from: range.from, to: range.to });
                } else if (range?.from) {
                  updateFilter('dateRange', { from: range.from, to: range.from });
                }
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
        
        {/* Search (requests only) */}
        {mode === 'requests' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guest, room..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="pl-9 h-10 sm:h-9"
              />
            </div>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleSearchSubmit}
              className="h-10 sm:h-9"
            >
              Search
            </Button>
          </div>
        )}
        
        {/* Status filter (requests only) */}
        {mode === 'requests' && (
          <Select
            value={filters.status || 'all'}
            onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-36 h-10 sm:h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* VIP toggle (requests only) */}
        {mode === 'requests' && (
          <Button
            variant={filters.isVip ? 'default' : 'outline'}
            size="sm"
            className="h-10 sm:h-9 gap-1.5"
            onClick={() => updateFilter('isVip', filters.isVip ? undefined : true)}
          >
            <Star className={cn('h-3.5 w-3.5', filters.isVip && 'fill-current')} />
            VIP Only
          </Button>
        )}
        
        {/* Zone filter (requests only) */}
        {mode === 'requests' && zones.length > 0 && (
          <Select
            value={filters.zoneId || 'all'}
            onValueChange={(v) => updateFilter('zoneId', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-32 h-10 sm:h-9">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Driver filter */}
        {drivers.length > 0 && (
          <Select
            value={filters.driverId || 'all'}
            onValueChange={(v) => updateFilter('driverId', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-40 h-10 sm:h-9">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.user_id} value={d.user_id}>
                  {d.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Buggy filter */}
        {buggies.length > 0 && (
          <Select
            value={filters.buggyId || 'all'}
            onValueChange={(v) => updateFilter('buggyId', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-full sm:w-36 h-10 sm:h-9">
              <SelectValue placeholder="Buggy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buggies</SelectItem>
              {buggies.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Active filters chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          
          {filters.status && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Status: {filters.status}
              <button
                onClick={() => clearFilter('status')}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.isVip && (
            <Badge variant="secondary" className="gap-1 pr-1">
              VIP Only
              <button
                onClick={() => clearFilter('isVip')}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.zoneId && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Zone: {filters.zoneId}
              <button
                onClick={() => clearFilter('zoneId')}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.driverId && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Driver: {drivers.find(d => d.user_id === filters.driverId)?.display_name || 'Selected'}
              <button
                onClick={() => clearFilter('driverId')}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.buggyId && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Buggy: {buggies.find(b => b.id === filters.buggyId)?.name || 'Selected'}
              <button
                onClick={() => clearFilter('buggyId')}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{filters.searchQuery}"
              <button
                onClick={() => {
                  clearFilter('searchQuery');
                  setSearchValue('');
                }}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
