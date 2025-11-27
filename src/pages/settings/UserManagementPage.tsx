import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole, Profile, Resort } from '@/types/database';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Shield, Plus, Trash2, Building2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface UserWithRoles extends Profile {
  roles: AppRole[];
  email?: string;
}

const ALL_ROLES: AppRole[] = ['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'];

const ROLE_COLORS: Record<AppRole, string> = {
  ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-success/10 text-success border-success/20',
  ACTIVITIES: 'bg-warning/10 text-warning border-warning/20',
  FNB: 'bg-info/10 text-info border-info/20',
};

export default function UserManagementPage() {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole('ADMIN');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchResorts();
    }
  }, [isAdmin]);

  const fetchResorts = async () => {
    const { data } = await supabase.from('resorts').select('*').order('name');
    if (data) setResorts(data);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (allRoles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !newRole) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role: newRole });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
        } else {
          throw error;
        }
      } else {
        toast.success(`Added ${newRole} role to ${selectedUser.full_name || 'user'}`);
        setRoleDialogOpen(false);
        setNewRole('');
        fetchUsers();
      }
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    // Prevent removing the last ADMIN role
    if (role === 'ADMIN') {
      const adminCount = users.filter(u => u.roles.includes('ADMIN')).length;
      if (adminCount <= 1) {
        toast.error('Cannot remove the last admin');
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success(`Removed ${role} role`);
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  const handleUpdateResort = async (userId: string, resortId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ resort_id: resortId })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Updated user resort assignment');
      fetchUsers();
    } catch (error) {
      console.error('Error updating resort:', error);
      toast.error('Failed to update resort');
    }
  };

  const openRoleDialog = (userItem: UserWithRoles) => {
    setSelectedUser(userItem);
    setNewRole('');
    setRoleDialogOpen(true);
  };

  const availableRoles = (userItem: UserWithRoles): AppRole[] => {
    return ALL_ROLES.filter(role => !userItem.roles.includes(role));
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need admin privileges to manage users"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="User Management"
        description="Manage staff roles and resort assignments"
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Users will appear here after they sign up"
        />
      ) : (
        <div className="grid gap-4">
          {users.map((userItem) => (
            <Card key={userItem.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {userItem.full_name || 'Unnamed User'}
                        {userItem.id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {userItem.department || 'No department'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRoleDialog(userItem)}
                    disabled={availableRoles(userItem).length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Roles */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {userItem.roles.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No roles assigned</span>
                    ) : (
                      userItem.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`${ROLE_COLORS[role]} flex items-center gap-1`}
                        >
                          {role}
                          <button
                            onClick={() => handleRemoveRole(userItem.id, role)}
                            className="ml-1 hover:text-destructive transition-colors"
                            title="Remove role"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Resort Assignment */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Resort Assignment
                  </p>
                  <Select
                    value={userItem.resort_id || 'none'}
                    onValueChange={(value) => handleUpdateResort(userItem.id, value === 'none' ? null : value)}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select resort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No resort assigned</SelectItem>
                      {resorts.map((resort) => (
                        <SelectItem key={resort.id} value={resort.id}>
                          {resort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Add a new role to {selectedUser?.full_name || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {selectedUser && availableRoles(selectedUser).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={!newRole || saving}>
              {saving ? 'Adding...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
