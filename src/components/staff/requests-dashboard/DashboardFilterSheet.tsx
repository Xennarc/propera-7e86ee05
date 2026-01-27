import { useState, useEffect } from 'react';
import { FilterSheet, FilterSection, FilterTrigger, FilterDivider } from '@/components/ui/filter-sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { StaffRequestPriority, StaffRequestFilters } from '@/hooks/useStaffServiceRequests';

interface Department {
  key: string;
  name: string;
}

interface DashboardFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  filters: StaffRequestFilters;
  onFiltersChange: (filters: StaffRequestFilters) => void;
  currentUserId?: string | null;
}

const PRIORITY_OPTIONS: { value: StaffRequestPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

const ASSIGNED_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All requests' },
  { value: 'me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned only' },
];

export function DashboardFilterSheet({
  open,
  onOpenChange,
  departments,
  filters,
  onFiltersChange,
  currentUserId,
}: DashboardFilterSheetProps) {
  // Local state for filter values
  const [localDepartments, setLocalDepartments] = useState<string[]>(filters.departments || []);
  const [localPriority, setLocalPriority] = useState<StaffRequestPriority | 'all'>(filters.priority || 'all');
  const [localAssigned, setLocalAssigned] = useState<string>(() => {
    if (filters.assignedTo === currentUserId) return 'me';
    if (filters.assignedTo === 'unassigned') return 'unassigned';
    return 'all';
  });
  const [localMultiItem, setLocalMultiItem] = useState(filters.hasMultipleItems || false);

  // Sync local state when filters prop changes
  useEffect(() => {
    setLocalDepartments(filters.departments || []);
    setLocalPriority(filters.priority || 'all');
    setLocalMultiItem(filters.hasMultipleItems || false);
    if (filters.assignedTo === currentUserId) {
      setLocalAssigned('me');
    } else if (filters.assignedTo === 'unassigned') {
      setLocalAssigned('unassigned');
    } else {
      setLocalAssigned('all');
    }
  }, [filters, currentUserId]);

  // Count active filters
  const activeCount =
    (localDepartments.length > 0 ? 1 : 0) +
    (localPriority !== 'all' ? 1 : 0) +
    (localAssigned !== 'all' ? 1 : 0) +
    (localMultiItem ? 1 : 0);

  const handleDepartmentToggle = (deptKey: string) => {
    setLocalDepartments((prev) =>
      prev.includes(deptKey) ? prev.filter((d) => d !== deptKey) : [...prev, deptKey]
    );
  };

  const handleClearAll = () => {
    setLocalDepartments([]);
    setLocalPriority('all');
    setLocalAssigned('all');
    setLocalMultiItem(false);
  };

  const handleApply = () => {
    const newFilters: StaffRequestFilters = {
      ...filters,
      departments: localDepartments.length > 0 ? localDepartments : undefined,
      priority: localPriority !== 'all' ? localPriority : undefined,
      assignedTo:
        localAssigned === 'me'
          ? currentUserId || undefined
          : localAssigned === 'unassigned'
          ? 'unassigned'
          : undefined,
      hasMultipleItems: localMultiItem || undefined,
    };
    onFiltersChange(newFilters);
    onOpenChange(false);
  };

  return (
    <>
      <FilterTrigger onClick={() => onOpenChange(true)} activeCount={activeCount} />

      <FilterSheet
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            // Apply filters when closing
            handleApply();
          }
          onOpenChange(isOpen);
        }}
        title="Filter Requests"
        activeCount={activeCount}
        onClear={handleClearAll}
      >
        {/* Department Filter */}
        {departments.length > 0 && (
          <>
            <FilterSection title="Department">
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <Button
                    key={dept.key}
                    variant={localDepartments.includes(dept.key) ? 'default' : 'outline'}
                    size="sm"
                    className="h-8"
                    onClick={() => handleDepartmentToggle(dept.key)}
                  >
                    {dept.name}
                  </Button>
                ))}
              </div>
            </FilterSection>

            <FilterDivider />
          </>
        )}

        {/* Priority Filter */}
        <FilterSection title="Priority">
          <RadioGroup
            value={localPriority}
            onValueChange={(val) => setLocalPriority(val as StaffRequestPriority | 'all')}
            className="space-y-2"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3">
                <RadioGroupItem value={opt.value} id={`priority-${opt.value}`} />
                <Label htmlFor={`priority-${opt.value}`} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FilterSection>

        <FilterDivider />

        {/* Assigned To Filter */}
        <FilterSection title="Assigned To">
          <RadioGroup
            value={localAssigned}
            onValueChange={setLocalAssigned}
            className="space-y-2"
          >
            {ASSIGNED_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3">
                <RadioGroupItem value={opt.value} id={`assigned-${opt.value}`} />
                <Label htmlFor={`assigned-${opt.value}`} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FilterSection>

        <FilterDivider />

        {/* Options */}
        <FilterSection title="Options">
          <div className="flex items-center justify-between">
            <Label htmlFor="multi-item-toggle" className="font-normal cursor-pointer">
              Multi-item requests only
            </Label>
            <Switch
              id="multi-item-toggle"
              checked={localMultiItem}
              onCheckedChange={setLocalMultiItem}
            />
          </div>
        </FilterSection>
      </FilterSheet>
    </>
  );
}
