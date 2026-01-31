import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { ResortRole, GlobalRole } from '@/types/database';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Mail,
  Building2,
  UserX,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Ban,
  Copy,
  ArrowUpDown,
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
import { EditUserAccessDrawer } from '@/components/superadmin/EditUserAccessDrawer';
import { RemoveUserDialog } from '@/components/superadmin/RemoveUserDialog';
import { RestoreUserDialog } from '@/components/superadmin/RestoreUserDialog';
import { PermanentDeleteUserDialog } from '@/components/superadmin/PermanentDeleteUserDialog';
import { AdvancedFiltersDrawer } from '@/components/superadmin/AdvancedFiltersDrawer';
import { SavedViewsDropdown } from '@/components/superadmin/SavedViewsDropdown';
import { ActiveFilterChips } from '@/components/superadmin/ActiveFilterChips';
import { UsersTablePagination } from '@/components/superadmin/UsersTablePagination';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SearchInput } from '@/components/ui/search-input';
import { 
  useUsersFilter, 
  filterUsers, 
  paginateUsers,
  UserWithMemberships,
  UserStatus,
  SortBy,
  SortDir,
} from '@/hooks/superadmin/useUsersFilter';

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  ACTIVITIES: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FNB: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  RESERVATIONS: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

function getUserStatus(user: UserWithMemberships): UserStatus {
  if (user.deleted_at) return 'deleted';
  if (user.is_disabled) return 'disabled';
  return 'active';
}

const STATUS_BADGE_CONFIG: Record<Exclude<UserStatus, 'all'>, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
  disabled: { label: 'Disabled', className: 'bg-warning/10 text-warning border-warning/20', icon: Ban },
  deleted: { label: 'Deleted', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Trash2 },
};

const STATUS_OPTIONS: { value: UserStatus; label: string; shortLabel?: string }[] = [
  { value: 'all', label: 'All', shortLabel: 'All' },
  { value: 'active', label: 'Active', shortLabel: 'Active' },
  { value: 'disabled', label: 'Disabled', shortLabel: 'Off' },
  { value: 'deleted', label: 'Deleted', shortLabel: 'Del' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A→Z)' },
  { value: 'name-desc', label: 'Name (Z→A)' },
  { value: 'joined-desc', label: 'Joined (newest)' },
  { value: 'joined-asc', label: 'Joined (oldest)' },
  { value: 'resorts_count-desc', label: 'Resorts (high→low)' },
  { value: 'resorts_count-asc', label: 'Resorts (low→high)' },
];

export default function GlobalUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resorts } = useResort();
  const { user: currentUser } = useAuth();
  
  // Use the new filter hook
  const {
    filter,
    updateFilter,
    resetFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    allViews,
    applyView,
    saveCurrentView,
    deleteView,
    activeFilterCount,
    hasActiveFilters,
  } = useUsersFilter();

  // Dialogs state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);
  const [accessDrawerOpen, setAccessDrawerOpen] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<UserWithMemberships | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<UserWithMemberships | null>(null);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter({ q: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, updateFilter]);

  // Fetch all users with memberships (client-side fallback)
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['global-users-list'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, global_role, created_at, is_disabled, deleted_at')
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
        is_disabled: profile.is_disabled ?? false,
        deleted_at: profile.deleted_at ?? null,
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

  // Apply client-side filtering and pagination
  const { filteredUsers, paginatedData } = useMemo(() => {
    if (!users) return { filteredUsers: [], paginatedData: { items: [], totalCount: 0, totalPages: 0 } };
    
    const filtered = filterUsers(users, filter);
    const paginated = paginateUsers(filtered, page, pageSize);
    
    return { filteredUsers: filtered, paginatedData: paginated };
  }, [users, filter, page, pageSize]);

  // Stats
  const pendingInvites = invitations?.filter(i => i.status === 'PENDING') || [];
  const superAdminCount = users?.filter(u => u.global_role === 'SUPER_ADMIN').length || 0;
  const multiResortUsers = users?.filter(u => u.memberships.length > 1).length || 0;
  const disabledCount = users?.filter(u => u.is_disabled && !u.deleted_at).length || 0;

  // Status counts for segmented control
  const statusCounts = useMemo(() => {
    if (!users) return { all: 0, active: 0, disabled: 0, deleted: 0 };
    return {
      all: users.length,
      active: users.filter(u => !u.is_disabled && !u.deleted_at).length,
      disabled: users.filter(u => u.is_disabled && !u.deleted_at).length,
      deleted: users.filter(u => u.deleted_at).length,
    };
  }, [users]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['global-users-list'] });
    queryClient.invalidateQueries({ queryKey: ['global-invitations'] });
  };

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

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('User ID copied');
  };

  const handleCopyUsername = (username: string) => {
    navigator.clipboard.writeText(username);
    toast.success('Username copied');
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortDir] = value.split('-') as [SortBy, SortDir];
    updateFilter({ sortBy, sortDir });
  };

  const currentSortValue = `${filter.sortBy}-${filter.sortDir}`;

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

      {/* Enhanced Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Top row: Search + Status + Sort + More Filters + Views */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left side: Search + Status */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by name, username, or ID..."
                className="w-full sm:w-72"
                debounceMs={0} // We handle debounce manually
              />
              
              <SegmentedControl
                value={filter.status}
                onChange={(value) => updateFilter({ status: value })}
                options={STATUS_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: opt.label,
                  shortLabel: opt.shortLabel,
                  count: statusCounts[opt.value],
                }))}
                size="sm"
              />
            </div>

            {/* Right side: Sort + Filters + Views */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={currentSortValue} onValueChange={handleSortChange}>
                <SelectTrigger className="w-44 h-9">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AdvancedFiltersDrawer
                filter={filter}
                onFilterChange={updateFilter}
                onReset={resetFilter}
                resorts={resorts.map(r => ({ id: r.id, name: r.name }))}
                activeFilterCount={activeFilterCount}
              />

              <SavedViewsDropdown
                views={allViews}
                onApply={applyView}
                onSave={saveCurrentView}
                onDelete={deleteView}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          {/* Active filter chips */}
          <ActiveFilterChips
            filter={filter}
            onFilterChange={updateFilter}
            onReset={resetFilter}
            resorts={resorts.map(r => ({ id: r.id, name: r.name }))}
          />
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
            Showing {paginatedData.items.length} of {paginatedData.totalCount} user{paginatedData.totalCount !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : paginatedData.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Resorts</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.items.map(user => {
                      const status = getUserStatus(user);
                      const statusConfig = STATUS_BADGE_CONFIG[status];
                      const StatusIcon = statusConfig.icon;
                      const isCurrentUser = user.id === currentUser?.id;
                      const isDeleted = status === 'deleted';
                      
                      return (
                        <TableRow key={user.id} className={`group ${isDeleted ? 'opacity-60' : ''}`}>
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
                            <Badge variant="outline" className={statusConfig.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
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
                            {user.memberships.length === 0 ? (
                              <span className="text-sm text-muted-foreground">No access</span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-sm font-medium hover:bg-muted"
                                onClick={() => {
                                  setSelectedUserForAccess(user);
                                  setAccessDrawerOpen(true);
                                }}
                              >
                                {user.memberships.length} resort{user.memberships.length !== 1 ? 's' : ''}
                              </Button>
                            )}
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
                                {/* Copy actions */}
                                <DropdownMenuItem onClick={() => handleCopyId(user.id)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy User ID
                                </DropdownMenuItem>
                                {user.username && (
                                  <DropdownMenuItem onClick={() => handleCopyUsername(user.username!)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Username
                                  </DropdownMenuItem>
                                )}
                                
                                {!isDeleted && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUserForAccess(user);
                                        setAccessDrawerOpen(true);
                                      }}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      Edit Access
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {/* Grant Super Admin - only for non-super-admin active users */}
                                {user.global_role !== 'SUPER_ADMIN' && status === 'active' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
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
                                
                                {/* Deactivate - for active users, not self */}
                                {status === 'active' && !isCurrentUser && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-warning focus:text-warning"
                                      onClick={() => {
                                        setSelectedUserForAction(user);
                                        setDeactivateDialogOpen(true);
                                      }}
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate User
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {/* Restore - for disabled users */}
                                {status === 'disabled' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-success focus:text-success"
                                      onClick={() => {
                                        setSelectedUserForAction(user);
                                        setRestoreDialogOpen(true);
                                      }}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Restore User
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {/* Permanent Delete - for non-self users */}
                                {!isCurrentUser && !isDeleted && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setSelectedUserForAction(user);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Permanent Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <UsersTablePagination
                page={page}
                pageSize={pageSize}
                totalCount={paginatedData.totalCount}
                totalPages={paginatedData.totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="No users found"
              description={hasActiveFilters ? "No users match your filter criteria" : "No users have been created yet"}
              action={hasActiveFilters ? (
                <Button variant="outline" onClick={resetFilter}>
                  Clear all filters
                </Button>
              ) : undefined}
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

      {/* Edit User Access Drawer */}
      <EditUserAccessDrawer
        open={accessDrawerOpen}
        onOpenChange={setAccessDrawerOpen}
        user={selectedUserForAccess}
        resorts={resorts.map(r => ({ id: r.id, name: r.name }))}
        onUpdated={handleRefresh}
      />

      {/* Deactivate User Dialog */}
      <RemoveUserDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        user={selectedUserForAction}
        onSuccess={handleRefresh}
      />

      {/* Restore User Dialog */}
      <RestoreUserDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        user={selectedUserForAction}
        onSuccess={handleRefresh}
      />

      {/* Permanent Delete User Dialog */}
      <PermanentDeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUserForAction}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
