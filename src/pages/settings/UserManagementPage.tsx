import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, GlobalRole } from '@/types/database';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Shield, Crown, Search, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface UserWithProfile extends Profile {
  email?: string;
}

const GLOBAL_ROLES: GlobalRole[] = ['SUPER_ADMIN', 'STANDARD'];

const GLOBAL_ROLE_COLORS: Record<GlobalRole, string> = {
  SUPER_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  STANDARD: 'bg-muted text-muted-foreground border-border',
};

const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  STANDARD: 'Standard',
};

export default function UserManagementPage() {
  const { isSuperAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [newGlobalRole, setNewGlobalRole] = useState<GlobalRole>('STANDARD');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchUsers();
    }
  }, [isSuperAdmin()]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;
      setUsers((profiles || []) as UserWithProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalRole = async () => {
    if (!selectedUser) return;

    // Prevent removing the last SUPER_ADMIN
    if (selectedUser.global_role === 'SUPER_ADMIN' && newGlobalRole === 'STANDARD') {
      const superAdminCount = users.filter(u => u.global_role === 'SUPER_ADMIN').length;
      if (superAdminCount <= 1) {
        toast.error('Cannot remove the last Super Admin');
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ global_role: newGlobalRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`Updated ${selectedUser.full_name}'s global role to ${GLOBAL_ROLE_LABELS[newGlobalRole]}`);
      setRoleDialogOpen(false);
      setConfirmDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating global role:', error);
      toast.error('Failed to update global role');
    } finally {
      setSaving(false);
    }
  };

  const openRoleDialog = (userItem: UserWithProfile) => {
    setSelectedUser(userItem);
    setNewGlobalRole(userItem.global_role);
    setRoleDialogOpen(true);
  };

  const handleRoleChangeSubmit = () => {
    // Check if this is a critical change requiring confirmation
    const isEscalatingToSuperAdmin = selectedUser?.global_role === 'STANDARD' && newGlobalRole === 'SUPER_ADMIN';
    const isRevokingSuperAdmin = selectedUser?.global_role === 'SUPER_ADMIN' && newGlobalRole === 'STANDARD';
    
    if (isEscalatingToSuperAdmin || isRevokingSuperAdmin) {
      setRoleDialogOpen(false);
      setConfirmDialogOpen(true);
    } else {
      handleUpdateGlobalRole();
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.department?.toLowerCase().includes(query)
    );
  });

  // Check if changing to/from Super Admin
  const isEscalatingToSuperAdmin = selectedUser?.global_role === 'STANDARD' && newGlobalRole === 'SUPER_ADMIN';
  const isRevokingSuperAdmin = selectedUser?.global_role === 'SUPER_ADMIN' && newGlobalRole === 'STANDARD';

  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need Super Admin privileges to manage platform users"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Platform Users"
        description="Manage global roles for all platform users"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={searchQuery ? "No users match your search" : "Users will appear here after they sign up"}
        />
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((userItem) => (
            <Card 
              key={userItem.id} 
              className={
                userItem.id === user?.id 
                  ? "bg-primary/5 border-primary/20" 
                  : undefined
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    {userItem.global_role === 'SUPER_ADMIN' ? (
                      <Crown className="h-5 w-5 text-destructive" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {userItem.full_name || 'Unnamed User'}
                      </span>
                      {userItem.id === user?.id && (
                        <Badge variant="outline" className="text-xs shrink-0">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {userItem.department || 'No department'}
                    </p>
                  </div>
                  
                  {/* Role Badge */}
                  <Badge
                    variant="outline"
                    className={GLOBAL_ROLE_COLORS[userItem.global_role]}
                  >
                    {GLOBAL_ROLE_LABELS[userItem.global_role]}
                  </Badge>
                  
                  {/* Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRoleDialog(userItem)}
                    className="shrink-0"
                  >
                    Change Role
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Role Selection Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Global Role</DialogTitle>
            <DialogDescription>
              Update global role for {selectedUser?.full_name || 'this user'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Warning for Super Admin escalation */}
          {isEscalatingToSuperAdmin && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Elevated Access Warning</AlertTitle>
              <AlertDescription>
                Granting Super Admin will give this user full platform access including all resorts and system settings.
              </AlertDescription>
            </Alert>
          )}

          <div className="py-4 space-y-3">
            <label className="text-sm font-medium">Select Role</label>
            <Select value={newGlobalRole} onValueChange={(value) => setNewGlobalRole(value as GlobalRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GLOBAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      {role === 'SUPER_ADMIN' && <Crown className="h-4 w-4 text-destructive" />}
                      {GLOBAL_ROLE_LABELS[role]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {newGlobalRole === 'SUPER_ADMIN' 
                ? 'Super Admins have full access to all resorts and can manage the entire platform.'
                : 'Standard users can only access resorts where they have memberships.'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRoleChangeSubmit} 
              disabled={saving || newGlobalRole === selectedUser?.global_role}
              variant={isEscalatingToSuperAdmin ? "destructive" : "default"}
            >
              {saving ? 'Saving...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Critical Confirmation Dialog for Super Admin changes */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={isEscalatingToSuperAdmin ? "Grant Super Admin Access?" : "Revoke Super Admin Access?"}
        description={
          isEscalatingToSuperAdmin 
            ? `You are about to grant ${selectedUser?.full_name || 'this user'} Super Admin privileges.`
            : `You are about to revoke ${selectedUser?.full_name || 'this user'}'s Super Admin privileges.`
        }
        impact={
          isEscalatingToSuperAdmin 
            ? "They will have full platform access including all resorts and system settings."
            : "They will lose access to all resorts except where they have explicit memberships."
        }
        variant="critical"
        confirmLabel={isEscalatingToSuperAdmin ? "Grant Super Admin" : "Revoke Access"}
        onConfirm={handleUpdateGlobalRole}
        isLoading={saving}
        requireTyping={isRevokingSuperAdmin ? selectedUser?.full_name || undefined : undefined}
        countdown={isEscalatingToSuperAdmin ? 3 : undefined}
      />
    </div>
  );
}
