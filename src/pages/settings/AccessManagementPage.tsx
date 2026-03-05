import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Search, 
  UserPlus, 
  Shield, 
  Settings, 
  Clock,
  Sparkles,
  Mail,
  User,
  MoreVertical,
  Key,
  X,
  RefreshCw,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { StaffInviteDialog } from '@/components/staff/StaffInviteDialog';
import { CreateStaffAccountDialog } from '@/components/staff/CreateStaffAccountDialog';
import { ResetPasswordDialog } from '@/components/staff/ResetPasswordDialog';
import { StaffProfileEditDialog } from '@/components/staff/StaffProfileEditDialog';
import { StaffProfileViewDialog } from '@/components/staff/StaffProfileViewDialog';
import { UserAccessDrawer } from '@/components/access/UserAccessDrawer';
import { ResortRole } from '@/types/database';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  user_id: string;
  resort_id: string;
  resort_role: ResortRole;
  department: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    global_role: string | null;
  } | null;
  email?: string;
}

interface StaffInvitation {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  resort_role: ResortRole;
  department: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  invited_by_name: string | null;
}

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-purple-500/10 text-purple-600 border-purple-200',
  MANAGER: 'bg-blue-500/10 text-blue-600 border-blue-200',
  FRONT_OFFICE: 'bg-teal-500/10 text-teal-600 border-teal-200',
  RESERVATIONS: 'bg-amber-500/10 text-amber-600 border-amber-200',
  ACTIVITIES: 'bg-green-500/10 text-green-600 border-green-200',
  FNB: 'bg-orange-500/10 text-orange-600 border-orange-200',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
};

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  RESERVATIONS: 'Reservations',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
  TRANSPORT: 'Transport',
};

export default function AccessManagementPage() {
  const { user, isSuperAdmin } = useAuth();
  const { currentResort } = useResort();
  const { hasPermission } = useEffectivePermissions();
  const queryClient = useQueryClient();
  const superAdmin = isSuperAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('staff');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [accessDrawerOpen, setAccessDrawerOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);

  const canManage = superAdmin || hasPermission('access.users.edit');

  // Fetch staff members
  const { data: staffMembers = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['access-staff-members', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];

      // First get memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select('*')
        .eq('resort_id', currentResort.id)
        .order('created_at', { ascending: false });

      if (membershipsError) throw membershipsError;
      if (!memberships || memberships.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(memberships.map(m => m.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, global_role')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create profile lookup map
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine memberships with profiles
      const membersWithProfiles = memberships.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id) || null,
      }));

      return membersWithProfiles as StaffMember[];
    },
    enabled: !!currentResort?.id,
  });

  // Fetch pending invitations
  const { data: pendingInvites = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery({
    queryKey: ['access-pending-invites', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];

      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StaffInvitation[];
    },
    enabled: !!currentResort?.id && canManage,
  });

  // Fetch invitation history
  const { data: inviteHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['access-invite-history', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];

      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('resort_id', currentResort.id)
        .or('status.neq.PENDING,expires_at.lt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as StaffInvitation[];
    },
    enabled: !!currentResort?.id && canManage,
  });

  // Real-time subscription for invitations
  useEffect(() => {
    if (!currentResort?.id || !canManage) return;

    const channel = supabase
      .channel('access-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_invitations',
          filter: `resort_id=eq.${currentResort.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newInv = payload.new as StaffInvitation;
            if (newInv.status === 'ACCEPTED') {
              toast.success(`${newInv.name || newInv.username || newInv.email} has joined!`);
              refetchStaff();
              refetchInvites();
              refetchHistory();
            }
          }
          refetchInvites();
          refetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentResort?.id, canManage]);

  // Filter staff by search
  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffMembers;
    const q = searchQuery.toLowerCase();
    return staffMembers.filter(m => 
      m.profile?.full_name?.toLowerCase().includes(q) ||
      m.profile?.username?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q)
    );
  }, [staffMembers, searchQuery]);

  const isNewMember = (createdAt: string) => {
    return differenceInHours(new Date(), new Date(createdAt)) < 24;
  };

  const handleOpenAccessDrawer = (member: StaffMember) => {
    setSelectedUser(member);
    setAccessDrawerOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!selectedUser || !currentResort) return;

    if (selectedUser.user_id === user?.id && selectedUser.resort_role === 'RESORT_ADMIN') {
      const adminCount = staffMembers.filter(m => m.resort_role === 'RESORT_ADMIN').length;
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
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Staff member removed from resort');
      setDeleteDialogOpen(false);
      refetchStaff();
    } catch (error) {
      console.error('Error deleting membership:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('staff_invitations')
      .update({ status: 'CANCELLED' })
      .eq('id', invitationId);

    if (error) {
      toast.error('Failed to cancel invitation');
      return;
    }

    toast.success('Invitation cancelled');
    refetchInvites();
    refetchHistory();
  };

  if (!currentResort) {
    return (
      <EmptyState
        icon={Shield}
        title="No Resort Selected"
        description="Please select a resort to manage access."
      />
    );
  }

  if (!canManage && !hasPermission('access.users.view')) {
    return (
      <EmptyState
        icon={Shield}
        title="Access Denied"
        description="You don't have permission to view access management."
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Access Management"
          description="Manage staff roles and permissions"
          action={canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateAccountOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
            </div>
          ) : undefined}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Staff
              <Badge variant="secondary" className="ml-1">{staffMembers.length}</Badge>
            </TabsTrigger>
            {canManage && (
              <>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  {pendingInvites.length > 0 && (
                    <Badge className="ml-1">{pendingInvites.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  History
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Staff Tab */}
          <TabsContent value="staff" className="mt-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {staffLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={User}
                title="No Staff Found"
                description={searchQuery ? "Try a different search term." : "Invite staff to get started."}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.map(member => (
                  <Card key={member.id} className="relative">
                    {isNewMember(member.created_at) && (
                      <Badge className="absolute -top-2 -right-2 bg-green-500">
                        <Sparkles className="h-3 w-3 mr-1" />
                        New
                      </Badge>
                    )}
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {member.profile?.full_name?.[0] || member.profile?.username?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.full_name || member.profile?.username || 'Unknown'}
                            </p>
                            {member.profile?.username && member.profile?.full_name && (
                              <p className="text-sm text-muted-foreground">@{member.profile.username}</p>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(member);
                                setViewDialogOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(member);
                                setEditDialogOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenAccessDrawer(member)}>
                                <Key className="h-4 w-4 mr-2" />
                                Edit Access
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(member);
                                  setResetPasswordOpen(true);
                                }}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSelectedUser(member);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className={cn("border", ROLE_COLORS[member.resort_role])}>
                          {ROLE_LABELS[member.resort_role]}
                        </Badge>
                        {member.profile?.global_role === 'SUPER_ADMIN' && (
                          <Badge className="bg-amber-500">Super Admin</Badge>
                        )}
                        {member.department && (
                          <Badge variant="outline">{member.department}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pending Invitations Tab */}
          <TabsContent value="pending" className="mt-6">
            {invitesLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : pendingInvites.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No Pending Invitations"
                description="All invitations have been processed."
              />
            ) : (
              <div className="space-y-2">
                {pendingInvites.map(invite => (
                  <Card key={invite.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{invite.name || invite.email}</p>
                          <p className="text-sm text-muted-foreground">{invite.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={cn("border", ROLE_COLORS[invite.resort_role])}>
                              {ROLE_LABELS[invite.resort_role]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleCancelInvitation(invite.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : inviteHistory.length === 0 ? (
              <EmptyState
                icon={RefreshCw}
                title="No History"
                description="No invitation history available."
              />
            ) : (
              <div className="space-y-2">
                {inviteHistory.map(invite => {
                  const isExpired = new Date(invite.expires_at) < new Date() && invite.status === 'PENDING';
                  const status = isExpired ? 'EXPIRED' : invite.status;
                  
                  return (
                    <Card key={invite.id} className="bg-muted/30">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{invite.name || invite.email}</p>
                            <p className="text-xs text-muted-foreground">{invite.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={status === 'ACCEPTED' ? 'default' : 'secondary'}
                              className={status === 'ACCEPTED' ? 'bg-green-500' : ''}
                            >
                              {status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <StaffInviteDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => {
          refetchInvites();
        }}
      />

      <CreateStaffAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        onSuccess={() => {
          refetchStaff();
        }}
      />

      {selectedUser && (
        <>
          <ResetPasswordDialog
            open={resetPasswordOpen}
            onOpenChange={setResetPasswordOpen}
            userId={selectedUser.user_id}
            userName={selectedUser.profile?.full_name || selectedUser.profile?.username || 'User'}
          />

          <StaffProfileViewDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            userId={selectedUser.user_id}
            resortRole={selectedUser.resort_role}
            department={selectedUser.department}
            memberSince={selectedUser.created_at}
            onEdit={() => {
              setViewDialogOpen(false);
              setEditDialogOpen(true);
            }}
          />

          <StaffProfileEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            userId={selectedUser.user_id}
            membershipId={selectedUser.id}
            currentRole={selectedUser.resort_role}
            currentDepartment={selectedUser.department}
            onSuccess={() => refetchStaff()}
          />

          <UserAccessDrawer
            open={accessDrawerOpen}
            onOpenChange={setAccessDrawerOpen}
            user={selectedUser.profile ? {
              id: selectedUser.user_id,
              full_name: selectedUser.profile.full_name,
              username: selectedUser.profile.username,
              email: selectedUser.email
            } : null}
            resortId={currentResort.id}
          />
        </>
      )}

      {/* Remove Member Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedUser?.profile?.full_name || selectedUser?.profile?.username || 'this member'} from {currentResort.name}?
              They will no longer have access to this resort's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
