import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResortRole, GlobalRole } from '@/types/database';
import {
  Crown,
  Building2,
  Trash2,
  Plus,
  Shield,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';

const RESORT_ROLES: ResortRole[] = [
  'RESORT_ADMIN',
  'MANAGER',
  'FRONT_OFFICE',
  'ACTIVITIES',
  'FNB',
  'RESERVATIONS',
  'TRANSPORT',
];

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
  RESERVATIONS: 'Reservations',
  TRANSPORT: 'Transport',
};

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  ACTIVITIES: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FNB: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  RESERVATIONS: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

interface UserMembership {
  id: string;
  resort_id: string;
  resort_name: string;
  resort_role: ResortRole;
}

interface UserWithMemberships {
  id: string;
  full_name: string | null;
  username: string | null;
  global_role: GlobalRole;
  created_at: string;
  memberships: UserMembership[];
}

interface Resort {
  id: string;
  name: string;
}

interface EditUserAccessDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithMemberships | null;
  resorts: Resort[];
  onUpdated: () => void;
}

export function EditUserAccessDrawer({
  open,
  onOpenChange,
  user,
  resorts,
  onUpdated,
}: EditUserAccessDrawerProps) {
  const queryClient = useQueryClient();
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<ResortRole | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [addResortId, setAddResortId] = useState<string>('');
  const [addRole, setAddRole] = useState<ResortRole>('FRONT_OFFICE');

  // Reset state when drawer closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingMembershipId(null);
      setPendingRole(null);
      setConfirmRemoveId(null);
      setAddResortId('');
      setAddRole('FRONT_OFFICE');
    }
    onOpenChange(newOpen);
  };

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: ResortRole }) => {
      const { error } = await supabase.rpc('admin_update_resort_member_role', {
        p_membership_id: membershipId,
        p_new_role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      setEditingMembershipId(null);
      setPendingRole(null);
      queryClient.invalidateQueries({ queryKey: ['global-users-list'] });
      onUpdated();
    },
    onError: (error: any) => {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Remove membership mutation
  const removeMembershipMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.rpc('admin_remove_membership_by_id', {
        p_membership_id: membershipId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Access removed successfully');
      setConfirmRemoveId(null);
      queryClient.invalidateQueries({ queryKey: ['global-users-list'] });
      onUpdated();
    },
    onError: (error: any) => {
      console.error('Error removing membership:', error);
      toast.error(error.message || 'Failed to remove access');
    },
  });

  // Add membership mutation
  const addMembershipMutation = useMutation({
    mutationFn: async ({ resortId, role }: { resortId: string; role: ResortRole }) => {
      if (!user) throw new Error('No user selected');
      const { error } = await supabase.rpc('admin_add_resort_member', {
        p_resort_id: resortId,
        p_user_id: user.id,
        p_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Resort access added');
      setAddResortId('');
      setAddRole('FRONT_OFFICE');
      queryClient.invalidateQueries({ queryKey: ['global-users-list'] });
      onUpdated();
    },
    onError: (error: any) => {
      console.error('Error adding membership:', error);
      toast.error(error.message || 'Failed to add access');
    },
  });

  if (!user) return null;

  const assignedResortIds = new Set(user.memberships.map(m => m.resort_id));
  const availableResorts = resorts.filter(r => !assignedResortIds.has(r.id));
  const membershipToRemove = user.memberships.find(m => m.id === confirmRemoveId);
  const isAnyMutating = updateRoleMutation.isPending || removeMembershipMutation.isPending || addMembershipMutation.isPending;

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className={user.global_role === 'SUPER_ADMIN' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}>
                  {user.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-left truncate">
                  {user.full_name || 'Unnamed User'}
                </DrawerTitle>
                <DrawerDescription className="text-left">
                  @{user.username || 'no-username'}
                </DrawerDescription>
              </div>
              {user.global_role === 'SUPER_ADMIN' && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Super Admin
                </Badge>
              )}
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4 py-4">
            {/* Current Resort Access */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Current Resort Access
              </div>

              {user.memberships.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
                  No resort access assigned
                </div>
              ) : (
                <div className="space-y-2">
                  {user.memberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{membership.resort_name}</p>
                        {editingMembershipId === membership.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Select
                              value={pendingRole || membership.resort_role}
                              onValueChange={(value) => setPendingRole(value as ResortRole)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RESORT_ROLES.map(role => (
                                  <SelectItem key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              disabled={updateRoleMutation.isPending}
                              onClick={() => {
                                setEditingMembershipId(null);
                                setPendingRole(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-2"
                              disabled={updateRoleMutation.isPending || !pendingRole || pendingRole === membership.resort_role}
                              onClick={() => {
                                if (pendingRole) {
                                  updateRoleMutation.mutate({
                                    membershipId: membership.id,
                                    newRole: pendingRole,
                                  });
                                }
                              }}
                            >
                              {updateRoleMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`mt-1 ${ROLE_COLORS[membership.resort_role]} cursor-pointer hover:opacity-80`}
                            onClick={() => {
                              setEditingMembershipId(membership.id);
                              setPendingRole(membership.resort_role);
                            }}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {ROLE_LABELS[membership.resort_role]}
                          </Badge>
                        )}
                      </div>
                      {editingMembershipId !== membership.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          disabled={isAnyMutating}
                          onClick={() => setConfirmRemoveId(membership.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Add Resort Access */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Plus className="h-4 w-4" />
                Add Resort Access
              </div>

              {availableResorts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
                  User has access to all resorts
                </div>
              ) : (
                <div className="space-y-3">
                  <Select value={addResortId} onValueChange={setAddResortId} disabled={isAnyMutating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resort..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableResorts.map(resort => (
                        <SelectItem key={resort.id} value={resort.id}>
                          {resort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={addRole} onValueChange={(v) => setAddRole(v as ResortRole)} disabled={isAnyMutating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RESORT_ROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    className="w-full"
                    disabled={!addResortId || addMembershipMutation.isPending}
                    onClick={() => {
                      if (addResortId) {
                        addMembershipMutation.mutate({ resortId: addResortId, role: addRole });
                      }
                    }}
                  >
                    {addMembershipMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Access
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DrawerFooter className="border-t pt-4">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirm Remove Dialog */}
      <Dialog open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Resort Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{user.full_name}</strong>'s access to{' '}
              <strong>{membershipToRemove?.resort_name}</strong>?
              <br /><br />
              They will no longer be able to access the staff console for this resort.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
              disabled={removeMembershipMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemoveId) {
                  removeMembershipMutation.mutate(confirmRemoveId);
                }
              }}
              disabled={removeMembershipMutation.isPending}
            >
              {removeMembershipMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
