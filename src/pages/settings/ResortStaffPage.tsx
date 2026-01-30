import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ResortMembership, ResortRole, GlobalRole, StaffInvitation, Profile } from '@/types/database';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Users, Shield, Trash2, Search, UserPlus, Mail, Clock, XCircle, KeyRound, User, AtSign, Pencil, Eye, CheckCircle2, History, Sparkles, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffInviteDialog } from '@/components/staff/StaffInviteDialog';
import { CreateStaffAccountDialog } from '@/components/staff/CreateStaffAccountDialog';
import { ResetPasswordDialog } from '@/components/staff/ResetPasswordDialog';
import { StaffProfileEditDialog } from '@/components/staff/StaffProfileEditDialog';
import { StaffProfileViewDialog } from '@/components/staff/StaffProfileViewDialog';
import { formatDistanceToNow, differenceInHours } from 'date-fns';

interface MembershipWithProfile extends ResortMembership {
  profile: Profile & { global_role?: GlobalRole };
}

const ALL_RESORT_ROLES: ResortRole[] = ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS', 'ACTIVITIES', 'FNB', 'TRANSPORT'];

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-success/10 text-success border-success/20',
  RESERVATIONS: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ACTIVITIES: 'bg-warning/10 text-warning border-warning/20',
  FNB: 'bg-info/10 text-info border-info/20',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  ACCEPTED: 'bg-success/10 text-success border-success/20',
  EXPIRED: 'bg-muted text-muted-foreground border-border',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function ResortStaffPage() {
  const { isSuperAdmin, getResortRole, user } = useAuth();
  const { currentResort } = useResort();
  const [memberships, setMemberships] = useState<MembershipWithProfile[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<StaffInvitation[]>([]);
  const [invitationHistory, setInvitationHistory] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipWithProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('staff');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const currentUserResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canManage = isSuperAdmin() || currentUserResortRole === 'RESORT_ADMIN';

  const fetchMemberships = useCallback(async () => {
    if (!currentResort) return;
    
    try {
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select('*')
        .eq('resort_id', currentResort.id)
        .order('created_at', { ascending: false });

      if (membershipsError) throw membershipsError;

      const userIds = (membershipsData || []).map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      const combined = (membershipsData || [])
        .map(m => ({
          ...m,
          profile: profileMap.get(m.user_id) as Profile,
        }))
        .filter(m => m.profile?.global_role !== 'SUPER_ADMIN');

      setMemberships(combined as MembershipWithProfile[]);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast.error('Failed to load resort staff');
    }
  }, [currentResort]);

  const fetchInvitations = useCallback(async () => {
    if (!currentResort) return;

    try {
      // Fetch pending invitations
      const { data: pending, error: pendingError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setPendingInvitations((pending || []) as StaffInvitation[]);

      // Fetch invitation history (accepted, expired, cancelled)
      const { data: history, error: historyError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('resort_id', currentResort.id)
        .neq('status', 'PENDING')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      setInvitationHistory((history || []) as StaffInvitation[]);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [currentResort]);

  // Initial data load
  useEffect(() => {
    if (currentResort && canManage) {
      setLoading(true);
      Promise.all([fetchMemberships(), fetchInvitations()]).finally(() => setLoading(false));
    }
  }, [currentResort, canManage, fetchMemberships, fetchInvitations]);

  // Set up realtime subscription for invitations
  useEffect(() => {
    if (!currentResort || !canManage) return;

    const channel = supabase
      .channel('staff-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_invitations',
          filter: `resort_id=eq.${currentResort.id}`,
        },
        (payload) => {
          console.log('Invitation change detected:', payload);
          
          // Refetch all invitation data
          fetchInvitations();
          fetchMemberships();
          
          // Show toast for accepted invitations
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newInv = payload.new as any;
            if (newInv.status === 'ACCEPTED' && payload.old && (payload.old as any).status === 'PENDING') {
              toast.success(
                `${newInv.name || newInv.username || newInv.email} has joined ${currentResort.name}!`,
                { icon: <CheckCircle2 className="h-4 w-4 text-success" /> }
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentResort, canManage, fetchInvitations, fetchMemberships]);

  // Polling fallback (every 30 seconds when tab is visible)
  useEffect(() => {
    if (!currentResort || !canManage) return;

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInvitations();
        fetchMemberships();
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [currentResort, canManage, fetchInvitations, fetchMemberships]);

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

  const handleDeleteMembership = async () => {
    if (!selectedMembership) return;

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
      m.profile?.username?.toLowerCase().includes(query) ||
      m.department?.toLowerCase().includes(query) ||
      m.resort_role.toLowerCase().includes(query)
    );
  });

  const isNewMember = (createdAt: string) => {
    return differenceInHours(new Date(), new Date(createdAt)) < 24;
  };

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" />
              Staff ({memberships.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              fetchInvitations();
              fetchMemberships();
            }}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-4">
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
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Staff
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMemberships.map((membership) => (
                <Card key={membership.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 relative">
                          <User className="h-6 w-6 text-primary" />
                          {isNewMember(membership.created_at) && (
                            <div className="absolute -top-1 -right-1">
                              <Badge className="h-5 px-1.5 text-[10px] bg-success text-white border-0">
                                <Sparkles className="h-3 w-3 mr-0.5" />
                                New
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {membership.profile?.full_name || 'Unnamed User'}
                            {membership.user_id === user?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </CardTitle>
                          {membership.profile?.username && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <AtSign className="h-3 w-3" />
                              {membership.profile.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={ROLE_COLORS[membership.resort_role]}
                      >
                        {ROLE_LABELS[membership.resort_role]}
                      </Badge>
                      {membership.department && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {membership.department}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMembership(membership);
                          setViewDialogOpen(true);
                        }}
                        className="text-muted-foreground"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
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
                          title="Edit profile"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMembership(membership);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                          title="Remove from resort"
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
        </TabsContent>

        {/* Pending Invitations Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingInvitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description="All invitations have been accepted or expired"
              action={
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Staff
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <Card key={inv.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">{inv.name || inv.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{inv.email}</span>
                          <span>•</span>
                          <Badge variant="outline" className={ROLE_COLORS[inv.resort_role]}>
                            {ROLE_LABELS[inv.resort_role]}
                          </Badge>
                          {inv.username && (
                            <>
                              <span>•</span>
                              <span className="font-mono">@{inv.username}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sent {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                          {' • '}Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCancelInvitation(inv.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {invitationHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="No invitation history"
              description="Past invitations will appear here"
            />
          ) : (
            <div className="space-y-3">
              {invitationHistory.map((inv) => (
                <Card key={inv.id} className="bg-muted/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        inv.status === 'ACCEPTED' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        {inv.status === 'ACCEPTED' ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{inv.name || inv.email}</p>
                          <Badge variant="outline" className={STATUS_COLORS[inv.status]}>
                            {inv.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{inv.email}</span>
                          <span>•</span>
                          <span>{ROLE_LABELS[inv.resort_role]}</span>
                          {inv.username && (
                            <>
                              <span>•</span>
                              <span className="font-mono">@{inv.username}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {inv.status === 'ACCEPTED' && inv.accepted_at ? (
                            <>Joined {formatDistanceToNow(new Date(inv.accepted_at), { addSuffix: true })}</>
                          ) : (
                            <>Updated {formatDistanceToNow(new Date(inv.updated_at), { addSuffix: true })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Staff Profile View Dialog */}
      {selectedMembership && (
        <StaffProfileViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          userId={selectedMembership.user_id}
          resortRole={selectedMembership.resort_role}
          department={selectedMembership.department}
          memberSince={selectedMembership.created_at}
          onEdit={() => {
            setViewDialogOpen(false);
            setEditDialogOpen(true);
          }}
        />
      )}

      {/* Staff Profile Edit Dialog */}
      {selectedMembership && (
        <StaffProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          userId={selectedMembership.user_id}
          membershipId={selectedMembership.id}
          currentRole={selectedMembership.resort_role}
          currentDepartment={selectedMembership.department}
          onSuccess={fetchMemberships}
        />
      )}

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
