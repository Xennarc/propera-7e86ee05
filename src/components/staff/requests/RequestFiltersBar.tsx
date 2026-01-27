import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Building2, Flag, User, Layers, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaffRequestPriority } from '@/hooks/useStaffServiceRequests';
import { useIsMobile } from '@/hooks/use-mobile';
import { FilterSheet, FilterTrigger, FilterSection, FilterDivider } from '@/components/ui/filter-sheet';

interface Department {
  key: string;
  name: string;
}

interface RequestFiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  departments: Department[];
  priorityFilter: StaffRequestPriority | 'all';
  onPriorityChange: (value: StaffRequestPriority | 'all') => void;
  assignedFilter: string;
  onAssignedChange: (value: string) => void;
  multiItemFilter: boolean;
  onMultiItemToggle: () => void;
  canAssign?: boolean;
  showDepartments?: boolean;
}

const PRIORITY_OPTIONS: { value: StaffRequestPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'URGENT', label: '🔴 Urgent' },
  { value: 'HIGH', label: '🟠 High' },
  { value: 'NORMAL', label: '🔵 Normal' },
  { value: 'LOW', label: '⚪ Low' },
];

export function RequestFiltersBar({
  searchQuery,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  departments,
  priorityFilter,
  onPriorityChange,
  assignedFilter,
  onAssignedChange,
  multiItemFilter,
  onMultiItemToggle,
  canAssign = false,
  showDepartments = true,
}: RequestFiltersBarProps) {
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFilterCount = [
    departmentFilter !== '__all__',
    priorityFilter !== 'all',
    assignedFilter !== '__all__',
    multiItemFilter,
  ].filter(Boolean).length;

  const hasActiveFilters = 
    searchQuery || 
    departmentFilter !== '__all__' || 
    priorityFilter !== 'all' || 
    assignedFilter !== '__all__' ||
    multiItemFilter;

  const clearAllFilters = () => {
    onSearchChange('');
    onDepartmentChange('__all__');
    onPriorityChange('all');
    onAssignedChange('__all__');
    if (multiItemFilter) onMultiItemToggle();
  };

  // Mobile: Search + Filter trigger
  if (isMobile) {
    return (
      <>
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guest, room..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-11"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter trigger */}
          <FilterTrigger
            onClick={() => setFilterSheetOpen(true)}
            activeCount={activeFilterCount}
          />
        </div>

        {/* Filter Sheet */}
        <FilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title="Filters"
          activeCount={activeFilterCount}
          onClear={clearAllFilters}
        >
          {/* Department */}
          {showDepartments && departments.length > 1 && (
            <>
              <FilterSection title="Department">
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={departmentFilter === '__all__'}
                      onCheckedChange={() => onDepartmentChange('__all__')}
                    />
                    <span className="text-sm">All Departments</span>
                  </label>
                  {departments.map((dept) => (
                    <label key={dept.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={departmentFilter === dept.key}
                        onCheckedChange={() => onDepartmentChange(dept.key)}
                      />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
              <FilterDivider />
            </>
          )}

          {/* Priority */}
          <FilterSection title="Priority">
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={priorityFilter === opt.value}
                    onCheckedChange={() => onPriorityChange(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          <FilterDivider />

          {/* Assigned */}
          {canAssign && (
            <>
              <FilterSection title="Assigned To">
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={assignedFilter === '__all__'}
                      onCheckedChange={() => onAssignedChange('__all__')}
                    />
                    <span className="text-sm">All</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={assignedFilter === '__me__'}
                      onCheckedChange={() => onAssignedChange('__me__')}
                    />
                    <span className="text-sm">Assigned to Me</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={assignedFilter === '__unassigned__'}
                      onCheckedChange={() => onAssignedChange('__unassigned__')}
                    />
                    <span className="text-sm">Unassigned</span>
                  </label>
                </div>
              </FilterSection>
              <FilterDivider />
            </>
          )}

          {/* Multi-item toggle */}
          <FilterSection title="Options">
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
              <Checkbox
                checked={multiItemFilter}
                onCheckedChange={onMultiItemToggle}
              />
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Multi-item requests only</span>
              </div>
            </label>
          </FilterSection>
        </FilterSheet>
      </>
    );
  }

  // Desktop: Inline filters
  return (
    <div className="space-y-3">
      {/* Main Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guest, room, or request..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Filter Selects */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {showDepartments && departments.length > 1 && (
            <Select value={departmentFilter} onValueChange={onDepartmentChange}>
              <SelectTrigger className="w-full sm:w-[160px] h-11">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Depts</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.key} value={dept.key}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={priorityFilter} onValueChange={(v) => onPriorityChange(v as any)}>
            <SelectTrigger className="w-full sm:w-[150px] h-11">
              <Flag className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canAssign && (
            <Select value={assignedFilter} onValueChange={onAssignedChange}>
              <SelectTrigger className="w-full sm:w-[160px] h-11">
                <User className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="__me__">Assigned to Me</SelectItem>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Multi-item toggle */}
          <Button
            variant={multiItemFilter ? 'default' : 'outline'}
            size="sm"
            className="h-11 gap-2 shrink-0"
            onClick={onMultiItemToggle}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Multi-item</span>
          </Button>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters active</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
