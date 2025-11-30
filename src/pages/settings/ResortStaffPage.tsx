import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Profile, ResortMembership, ResortRole, GlobalRole, StaffInvitation } from '@/types/database';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Users, Shield, Trash2, Search, UserPlus, Mail, Clock, XCircle, KeyRound, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffInviteDialog } from '@/components/staff/StaffInviteDialog';
import { CreateStaffAccountDialog } from '@/components/staff/CreateStaffAccountDialog';
import { ResetPasswordDialog } from '@/components/staff/ResetPasswordDialog';

interface MembershipWithProfile extends ResortMembership {
  profile: Profile & { global_role?: GlobalRole };
}

const ALL_RESORT_ROLES: ResortRole[] = ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'];

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-success/10 text-success border-success/20',
  ACTIVITIES: 'bg-warning/10 text-warning border-warning/20',
  FNB: 'bg-info/10 text-info border-info/20',
};

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

export default function ResortStaffPage() {
  const { isSuperAdmin, getResortRole, user } = useAuth();
  const { currentResort } = useResort();
  const [memberships, setMemberships] = useState<MembershipWithProfile[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipWithProfile | null>(null);
  const [newMembership, setNewMembership] = useState({
    user_id: '',
    resort_role: '' as ResortRole | '',
    department: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUserResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canManage = isSuperAdmin() || currentUserResortRole === 'RESORT_ADMIN';

  useEffect(() => {
    if (currentResort && canManage) {
      fetchMemberships();
      fetchAvailableUsers();
      fetchInvitations();
    }
  }, [currentResort, canManage]);

  const fetchMemberships = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    try {
      // First get memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select('*')
        .eq('resort_id', currentResort.id)
        .order('created_at', { ascending: false });

      if (membershipsError) throw membershipsError;

      // Then get profiles for these memberships
      const userIds = (membershipsData || []).map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine memberships with profiles, filtering out SUPER_ADMIN users
      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      const combined = (membershipsData || [])
        .map(m => ({
          ...m,
          profile: profileMap.get(m.user_id) as Profile,
        }))
        // Filter out SUPER_ADMIN users - they should not appear in resort staff lists
        .filter(m => m.profile?.global_role !== 'SUPER_ADMIN');

      setMemberships(combined as MembershipWithProfile[]);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast.error('Failed to load resort staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!currentResort) return;

    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get existing memberships for this resort
      const { data: existingMemberships, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select('user_id')
        .eq('resort_id', currentResort.id);

      if (membershipsError) throw membershipsError;

      const existingUserIds = new Set((existingMemberships || []).map(m => m.user_id));
      // Filter out SUPER_ADMIN users and those already in resort
      const available = (profiles || []).filter(p => 
        !existingUserIds.has(p.id) && p.global_role !== 'SUPER_ADMIN'
      );
      
      setAvailableUsers(available as Profile[]);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!currentResort) return;

    try {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as StaffInvitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ status: 'CANCELLED' })
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleAddMembership = async () => {
    if (!currentResort || !newMembership.user_id || !newMembership.resort_role) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('resort_memberships')
        .insert({
          user_id: newMembership.user_id,
          resort_id: currentResort.id,
          resort_role: newMembership.resort_role,
          department: newMembership.department || null,
        });

      if (error) throw error;

      toast.success('Staff member added to resort');
      setAddDialogOpen(false);
      setNewMembership({ user_id: '', resort_role: '', department: '' });
      fetchMemberships();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error adding membership:', error);
      toast.error('Failed to add staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMembership = async () => {
    if (!selectedMembership) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('resort_memberships')
        .update({
          resort_role: selectedMembership.resort_role,
          department: selectedMembership.department,
        })
        .eq('id', selectedMembership.id);

      if (error) throw error;

      toast.success('Staff member updated');
      setEditDialogOpen(false);
      fetchMemberships();
    } catch (error) {
      console.error('Error updating membership:', error);
      toast.error('Failed to update staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMembership = async () => {
    if (!selectedMembership) return;

    // Prevent deleting self if you're the only RESORT_ADMIN
    if (selectedMembership.user_id === user?.id && selectedMembership.resort_role === 'RESORT_ADMIN') {
      const adminCount = memberships.filter(m => m.resort_role === 'RESORT_ADMIN').length;
      if (adminCount <= 1) {
        toast.error('Cannot remove yourself as the only Resort Admin');
        setDeleteDialogOpen(false);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('resort_memberships')
        .delete()
        .eq('id', selectedMembership.id);

      if (error) throw error;

      toast.success('Staff member removed from resort');
      setDeleteDialogOpen(false);
      fetchMemberships();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error deleting membership:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const filteredMemberships = memberships.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.profile?.full_name?.toLowerCase().includes(query) ||
      m.department?.toLowerCase().includes(query) ||
      m.resort_role.toLowerCase().includes(query)
    );
  });

  if (!currentResort) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Users}
          title="No Resort Selected"
          description="Please select a resort to manage staff"
        />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need Resort Admin privileges to manage staff"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resort Staff"
        description={`Manage staff members for ${currentResort.name}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
              <User className="h-4 w-4 mr-2" />
              Add Existing
            </Button>
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Invite by Email
            </Button>
            <Button onClick={() => setCreateAccountDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
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
      ) : filteredMemberships.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members"
          description={searchQuery ? "No staff match your search" : "Add staff members to this resort"}
          action={
            !searchQuery && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMemberships.map((membership) => (
            <Card key={membership.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {membership.profile?.full_name || 'Unnamed User'}
                        {membership.user_id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {membership.department || 'No department'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={ROLE_COLORS[membership.resort_role]}
                  >
                    {ROLE_LABELS[membership.resort_role]}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMembership(membership);
                        setResetPasswordDialogOpen(true);
                      }}
                      title="Reset password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMembership(membership);
                        setEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMembership(membership);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Add a user to {currentResort.name} with a specific role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select 
                value={newMembership.user_id} 
                onValueChange={(value) => setNewMembership(prev => ({ ...prev, user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      All users already have access to this resort
                    </div>
                  ) : (
                    availableUsers.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || 'Unnamed User'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={newMembership.resort_role} 
                onValueChange={(value) => setNewMembership(prev => ({ ...prev, resort_role: value as ResortRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_RESORT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department (optional)</Label>
              <Input
                value={newMembership.department}
                onChange={(e) => setNewMembership(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Dive Center, Reception"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMembership} 
              disabled={!newMembership.user_id || !newMembership.resort_role || saving}
            >
              {saving ? 'Adding...' : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update role and department for {selectedMembership?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedMembership && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={selectedMembership.resort_role} 
                  onValueChange={(value) => setSelectedMembership(prev => prev ? { ...prev, resort_role: value as ResortRole } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_RESORT_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department (optional)</Label>
                <Input
                  value={selectedMembership.department || ''}
                  onChange={(e) => setSelectedMembership(prev => prev ? { ...prev, department: e.target.value } : null)}
                  placeholder="e.g., Dive Center, Reception"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMembership} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMembership?.profile?.full_name} from {currentResort.name}? 
              They will no longer have access to this resort's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMembership} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{inv.name || inv.email}</p>
                    <p className="text-sm text-muted-foreground">{inv.email} • {ROLE_LABELS[inv.resort_role]}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(inv.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Invite Dialog */}
      <StaffInviteDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchInvitations}
      />

      {/* Create Staff Account Dialog */}
      <CreateStaffAccountDialog 
        open={createAccountDialogOpen} 
        onOpenChange={setCreateAccountDialogOpen}
        onSuccess={() => {
          fetchMemberships();
          fetchAvailableUsers();
        }}
      />

      {/* Reset Password Dialog */}
      {selectedMembership && (
        <ResetPasswordDialog 
          open={resetPasswordDialogOpen} 
          onOpenChange={setResetPasswordDialogOpen}
          userId={selectedMembership.user_id}
          userName={selectedMembership.profile?.full_name || 'Staff member'}
        />
      )}
    </div>
  );
}
