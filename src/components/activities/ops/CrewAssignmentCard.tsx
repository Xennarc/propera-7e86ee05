/**
 * CrewAssignmentCard – Assign guides, instructors, and captain to a session.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X, Check } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  useSessionStaffAssignments,
  useAddStaffAssignment,
  useRemoveStaffAssignment,
  useResortStaffList,
  type ResortStaffMember,
} from '@/hooks/useSessionStaffAssignments';
import type { StaffAssignmentRole } from '@/types/ops';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  resortId: string;
}

const ROLE_CONFIG: Record<StaffAssignmentRole, { label: string; plural: string; multiSelect: boolean }> = {
  captain: { label: 'Captain', plural: 'Captain', multiSelect: false },
  guide: { label: 'Guide', plural: 'Guides', multiSelect: true },
  instructor: { label: 'Instructor', plural: 'Instructors', multiSelect: true },
  crew: { label: 'Crew', plural: 'Crew', multiSelect: true },
};

export function CrewAssignmentCard({ sessionId, resortId }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRole, setPickerRole] = useState<StaffAssignmentRole>('guide');
  const { data: assignments = [] } = useSessionStaffAssignments(sessionId);
  const { data: staffList = [] } = useResortStaffList(resortId);
  const addStaff = useAddStaffAssignment(sessionId);
  const removeStaff = useRemoveStaffAssignment(sessionId);

  const openPicker = (role: StaffAssignmentRole) => {
    setPickerRole(role);
    setPickerOpen(true);
  };

  const roleAssignments = (role: StaffAssignmentRole) =>
    assignments.filter(a => a.role === role);

  const isAssigned = (userId: string, role: StaffAssignmentRole) =>
    assignments.some(a => a.staff_user_id === userId && a.role === role);

  const handleToggle = (staff: ResortStaffMember) => {
    const existing = assignments.find(
      a => a.staff_user_id === staff.user_id && a.role === pickerRole
    );
    if (existing) {
      removeStaff.mutate(existing.id);
    } else {
      const config = ROLE_CONFIG[pickerRole];
      // Single-select: remove existing first
      if (!config.multiSelect) {
        const current = roleAssignments(pickerRole);
        if (current.length > 0) {
          removeStaff.mutate(current[0].id, {
            onSuccess: () => {
              addStaff.mutate({
                resort_id: resortId,
                staff_user_id: staff.user_id,
                role: pickerRole,
              });
            },
          });
          if (!config.multiSelect) setPickerOpen(false);
          return;
        }
      }
      addStaff.mutate({
        resort_id: resortId,
        staff_user_id: staff.user_id,
        role: pickerRole,
      });
      if (!config.multiSelect) setPickerOpen(false);
    }
  };

  const getStaffName = (userId: string) =>
    staffList.find(s => s.user_id === userId)?.full_name ?? 'Unknown';

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Crew</span>
          </div>

          {(Object.entries(ROLE_CONFIG) as [StaffAssignmentRole, typeof ROLE_CONFIG[StaffAssignmentRole]][]).map(
            ([role, config]) => {
              const assigned = roleAssignments(role);
              return (
                <div key={role} className="flex items-center justify-between min-h-[36px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
                      {config.plural}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {assigned.length === 0 ? (
                        <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                      ) : (
                        assigned.map(a => (
                          <Badge
                            key={a.id}
                            variant="secondary"
                            className="text-xs font-medium gap-1 pr-1"
                          >
                            {getStaffName(a.staff_user_id)}
                            <button
                              onClick={() => removeStaff.mutate(a.id)}
                              className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => openPicker(role)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            }
          )}
        </CardContent>
      </Card>

      <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>
              Assign {ROLE_CONFIG[pickerRole].label}
            </DrawerTitle>
            <DrawerDescription>
              {ROLE_CONFIG[pickerRole].multiSelect
                ? 'Select one or more staff members'
                : 'Select a staff member'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1.5 overflow-y-auto">
            {staffList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No staff members found.
              </p>
            ) : (
              staffList.map(staff => {
                const selected = isAssigned(staff.user_id, pickerRole);
                return (
                  <button
                    key={staff.user_id}
                    onClick={() => handleToggle(staff)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors min-h-[44px]',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{staff.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{staff.resort_role.replace('_', ' ').toLowerCase()}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
          {ROLE_CONFIG[pickerRole].multiSelect && (
            <div className="px-4 pb-6">
              <Button className="w-full h-12 text-base" onClick={() => setPickerOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
