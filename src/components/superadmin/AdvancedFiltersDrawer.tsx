import { useState, useEffect } from 'react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SlidersHorizontal, RotateCcw, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsersFilter, DEFAULT_USERS_FILTER, AccessType } from '@/hooks/superadmin/useUsersFilter';
import { ResortRole } from '@/types/database';

interface Resort {
  id: string;
  name: string;
}

interface AdvancedFiltersDrawerProps {
  filter: UsersFilter;
  onFilterChange: (updates: Partial<UsersFilter>) => void;
  onReset: () => void;
  resorts: Resort[];
  activeFilterCount: number;
}

const RESORT_ROLES: { value: ResortRole; label: string }[] = [
  { value: 'RESORT_ADMIN', label: 'Resort Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'FRONT_OFFICE', label: 'Front Office' },
  { value: 'ACTIVITIES', label: 'Activities' },
  { value: 'FNB', label: 'F&B' },
  { value: 'RESERVATIONS', label: 'Reservations' },
  { value: 'TRANSPORT', label: 'Transport' },
];

export function AdvancedFiltersDrawer({
  filter,
  onFilterChange,
  onReset,
  resorts,
  activeFilterCount,
}: AdvancedFiltersDrawerProps) {
  const [open, setOpen] = useState(false);

  // Local state for date inputs
  const [localJoinedFrom, setLocalJoinedFrom] = useState(filter.joinedFrom || '');
  const [localJoinedTo, setLocalJoinedTo] = useState(filter.joinedTo || '');

  // Sync local state when filter changes
  useEffect(() => {
    setLocalJoinedFrom(filter.joinedFrom || '');
    setLocalJoinedTo(filter.joinedTo || '');
  }, [filter.joinedFrom, filter.joinedTo]);

  const handleDateBlur = (field: 'joinedFrom' | 'joinedTo', value: string) => {
    onFilterChange({ [field]: value || undefined });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">More Filters</span>
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="h-5 min-w-5 px-1.5 text-[10px] bg-primary/15 text-primary"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-4">
          <DrawerTitle>Advanced Filters</DrawerTitle>
          <DrawerDescription>
            Fine-tune your user search with additional filters
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-6">
            {/* Global Role */}
            <div className="space-y-2">
              <Label htmlFor="globalRole">Global Role</Label>
              <Select
                value={filter.globalRole}
                onValueChange={(value) => onFilterChange({ globalRole: value })}
              >
                <SelectTrigger id="globalRole">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resort */}
            <div className="space-y-2">
              <Label htmlFor="resort">Resort</Label>
              <Select
                value={filter.resortId}
                onValueChange={(value) => onFilterChange({ resortId: value })}
              >
                <SelectTrigger id="resort">
                  <SelectValue placeholder="All Resorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resorts</SelectItem>
                  {resorts.map((resort) => (
                    <SelectItem key={resort.id} value={resort.id}>
                      {resort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resort Role */}
            <div className="space-y-2">
              <Label htmlFor="resortRole">Resort Role</Label>
              <Select
                value={filter.resortRole}
                onValueChange={(value) => onFilterChange({ resortRole: value })}
              >
                <SelectTrigger id="resortRole">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {RESORT_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Label htmlFor="access">Access Type</Label>
              <Select
                value={filter.access}
                onValueChange={(value) => onFilterChange({ access: value as AccessType })}
              >
                <SelectTrigger id="access">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="has_access">Has resort access</SelectItem>
                  <SelectItem value="no_access">No resort access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Multi-resort toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="multiResort">Multi-resort only</Label>
                <p className="text-xs text-muted-foreground">
                  Users with access to 2+ resorts
                </p>
              </div>
              <Switch
                id="multiResort"
                checked={filter.multiResortOnly}
                onCheckedChange={(checked) => onFilterChange({ multiResortOnly: checked })}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joined Date Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="joinedFrom" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="joinedFrom"
                    type="date"
                    value={localJoinedFrom}
                    onChange={(e) => setLocalJoinedFrom(e.target.value)}
                    onBlur={(e) => handleDateBlur('joinedFrom', e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="joinedTo" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="joinedTo"
                    type="date"
                    value={localJoinedTo}
                    onChange={(e) => setLocalJoinedTo(e.target.value)}
                    onBlur={(e) => handleDateBlur('joinedTo', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="pt-4 border-t">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onReset}
              className="flex-1 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
            <DrawerClose asChild>
              <Button className="flex-1">
                Apply Filters
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
