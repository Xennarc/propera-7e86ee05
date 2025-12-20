import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole, GlobalRole } from '@/types/database';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Users,
  Search,
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Mail,
  Clock,
  Building2,
  UserX,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  ACTIVITIES: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FNB: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  RESERVATIONS: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};

interface UserWithMemberships {
  id: string;
  full_name: string | null;
  username: string | null;
  global_role: GlobalRole;
  created_at: string;
  memberships: {
    id: string;
    resort_id: string;
    resort_name: string;
    resort_role: ResortRole;
  }[];
}

export default function GlobalUsersPage() {
  const navigate = useNavigate();
  const { resorts } = useResort();
  const [searchQuery, setSearchQuery] = useState('');
  const [resortFilter, setResortFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);

  // Fetch all users with memberships
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['global-users-list'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, global_role, created_at')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: memberships, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select('id, user_id, resort_id, resort_role');

      if (membershipsError) throw membershipsError;

      const userList: UserWithMemberships[] = (profiles || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        username: profile.username,
        global_role: profile.global_role as GlobalRole,
        created_at: profile.created_at,
        memberships: (memberships || [])
          .filter(m => m.user_id === profile.id)
          .map(m => {
            const resort = resorts.find(r => r.id === m.resort_id);
            return {
              id: m.id,
              resort_id: m.resort_id,
              resort_name: resort?.name || 'Unknown Resort',
              resort_role: m.resort_role as ResortRole,
            };
          }),
      }));

      return userList;
    },
  });

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ['global-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const filteredUsers = users?.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = user.full_name?.toLowerCase().includes(query);
      const matchesUsername = user.username?.toLowerCase().includes(query);
      if (!matchesName && !matchesUsername) return false;
    }
    if (resortFilter !== 'all' && !user.memberships.some(m => m.resort_id === resortFilter)) {
      return false;
    }
    if (roleFilter === 'SUPER_ADMIN' && user.global_role !== 'SUPER_ADMIN') {
      return false;
    }
    if (roleFilter !== 'all' && roleFilter !== 'SUPER_ADMIN' && !user.memberships.some(m => m.resort_role === roleFilter)) {
      return false;
    }
    return true;
  }) || [];

  const pendingInvites = invitations?.filter(i => i.status === 'PENDING') || [];
  const superAdminCount = users?.filter(u => u.global_role === 'SUPER_ADMIN').length || 0;
  const multiResortUsers = users?.filter(u => u.memberships.length > 1).length || 0;

  const handleGrantSuperAdmin = async () => {
    if (!selectedUser) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ global_role: 'SUPER_ADMIN' })
      .eq('id', selectedUser.id);

    if (error) {
      toast.error('Failed to grant Super Admin access');
      return;
    }

    toast.success(`${selectedUser.full_name} is now a Super Admin`);
    setConfirmDialogOpen(false);
    setSelectedUser(null);
    refetch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Users & Access
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions across all resorts
          </p>
        </div>
        <Button onClick={() => navigate('/superadmin/users/invite')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <Crown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{superAdminCount}</p>
                <p className="text-xs text-muted-foreground">Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/10">
                <Mail className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
                <p className="text-xs text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-info/10">
                <Building2 className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{multiResortUsers}</p>
                <p className="text-xs text-muted-foreground">Multi-Resort</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={resortFilter} onValueChange={setResortFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Resorts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resorts</SelectItem>
                {resorts.map(resort => (
                  <SelectItem key={resort.id} value={resort.id}>{resort.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="RESORT_ADMIN">Resort Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="FRONT_OFFICE">Front Office</SelectItem>
                <SelectItem value="ACTIVITIES">Activities</SelectItem>
                <SelectItem value="FNB">F&B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {pendingInvites.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.slice(0, 5).map(invite => {
                const resort = resorts.find(r => r.id === invite.resort_id);
                return (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-warning/10 text-warning text-xs">
                          {invite.email?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {resort?.name} • {invite.resort_role?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                      </span>
                      <Button variant="ghost" size="sm">Resend</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Resort Access</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={user.global_role === 'SUPER_ADMIN' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}>
                            {user.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">@{user.username || 'no-username'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.global_role === 'SUPER_ADMIN' ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <Crown className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">Standard</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.memberships.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No resort access</span>
                        ) : (
                          user.memberships.slice(0, 3).map(m => (
                            <Badge key={m.id} variant="outline" className={ROLE_COLORS[m.resort_role]}>
                              {m.resort_name}
                            </Badge>
                          ))
                        )}
                        {user.memberships.length > 3 && (
                          <Badge variant="outline">+{user.memberships.length - 3} more</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Edit Access
                          </DropdownMenuItem>
                          {user.global_role !== 'SUPER_ADMIN' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setConfirmDialogOpen(true);
                                }}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                Grant Super Admin
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Users}
              title="No users found"
              description={searchQuery ? "No users match your search criteria" : "No users have been created yet"}
            />
          )}
        </CardContent>
      </Card>

      {/* Super Admin Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Grant Super Admin Access
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You are about to grant <strong>{selectedUser?.full_name}</strong> Super Admin access.
              </p>
              <p className="text-destructive font-medium">
                This will give them full control over the entire Propera platform, including all resorts and users.
              </p>
              <p>Are you absolutely sure?</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleGrantSuperAdmin}>
              Yes, Grant Super Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
