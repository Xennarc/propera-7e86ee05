import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { toast } from 'sonner';
import { 
  Users, Shield, Crown, Search, Building2, AlertTriangle,
  UserX, RefreshCw, ExternalLink
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { GlobalRole, ResortRole } from '@/types/database';

interface StaffMember {
  id: string;
  full_name: string | null;
  username: string | null;
  global_role: GlobalRole;
  memberships: {
    id: string;
    resort_id: string;
    resort_name: string;
    resort_role: ResortRole;
    department: string | null;
  }[];
}

const RESORT_ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  ACTIVITIES: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FNB: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  RESERVATIONS: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

export default function GlobalStaffPage() {
  const { resorts } = useResort();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [resortFilter, setResortFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'reset'>('deactivate');

  // Fetch all staff with memberships
  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ['global-staff-list'],
    queryFn: async () => {
      // Get all profiles (excluding super admins from view unless they have memberships)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, global_role')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select('id, user_id, resort_id, resort_role, department');

      if (membershipsError) throw membershipsError;

      // Combine data
      const staffList: StaffMember[] = (profiles || [])
        .filter(p => p.global_role !== 'SUPER_ADMIN' || memberships?.some(m => m.user_id === p.id))
        .map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          global_role: profile.global_role as GlobalRole,
          memberships: (memberships || [])
            .filter(m => m.user_id === profile.id)
            .map(m => {
              const resort = resorts.find(r => r.id === m.resort_id);
              return {
                id: m.id,
                resort_id: m.resort_id,
                resort_name: resort?.name || 'Unknown Resort',
                resort_role: m.resort_role as ResortRole,
                department: m.department,
              };
            }),
        }))
        .filter(s => s.memberships.length > 0 || s.global_role === 'SUPER_ADMIN');

      return staffList;
    },
  });

  // Filter staff
  const filteredStaff = staffMembers?.filter(staff => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = staff.full_name?.toLowerCase().includes(query);
      const matchesUsername = staff.username?.toLowerCase().includes(query);
      if (!matchesName && !matchesUsername) return false;
    }
    if (resortFilter !== 'all' && !staff.memberships.some(m => m.resort_id === resortFilter)) {
      return false;
    }
    if (roleFilter !== 'all' && !staff.memberships.some(m => m.resort_role === roleFilter)) {
      return false;
    }
    return true;
  }) || [];

  // Remove membership mutation
  const removeMembershipMutation = useMutation({
    mutationFn: async ({ staffId, membershipId }: { staffId: string; membershipId: string }) => {
      const { error } = await supabase
        .from('resort_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      // Log the action
      const membership = selectedStaff?.memberships.find(m => m.id === membershipId);
      await supabase.rpc('log_admin_action', {
        p_action: 'remove_staff_access',
        p_resort_id: membership?.resort_id,
        p_metadata: { staff_id: staffId, membership_id: membershipId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-staff-list'] });
      toast.success('Staff access removed');
      setConfirmDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (error) => {
      console.error('Error removing membership:', error);
      toast.error('Failed to remove staff access');
    },
  });

  const handleRemoveAccess = (staff: StaffMember, membershipId: string) => {
    setSelectedStaff(staff);
    setActionType('deactivate');
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedStaff) return;
    
    if (actionType === 'deactivate' && selectedStaff.memberships.length > 0) {
      // Remove first membership (could be enhanced to select specific one)
      removeMembershipMutation.mutate({
        staffId: selectedStaff.id,
        membershipId: selectedStaff.memberships[0].id,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Staff Management"
        description="View and manage staff across all resorts"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
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
              <SelectItem key={resort.id} value={resort.id}>
                {resort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="RESORT_ADMIN">Resort Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="FRONT_OFFICE">Front Office</SelectItem>
            <SelectItem value="ACTIVITIES">Activities</SelectItem>
            <SelectItem value="FNB">F&B</SelectItem>
            <SelectItem value="RESERVATIONS">Reservations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffMembers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Super Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffMembers?.filter(s => s.global_role === 'SUPER_ADMIN').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Multi-Resort Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffMembers?.filter(s => s.memberships.length > 1).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredStaff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Global Role</TableHead>
                  <TableHead>Resort Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id} className="group">
                    <TableCell>
                      <span className="font-medium">
                        {staff.full_name || 'Unnamed'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {staff.username || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {staff.global_role === 'SUPER_ADMIN' ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <Crown className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">Standard</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {staff.memberships.length === 0 ? (
                          <span className="text-muted-foreground text-sm">No resort access</span>
                        ) : (
                          staff.memberships.map(m => (
                            <Badge 
                              key={m.id} 
                              variant="outline"
                              className={RESORT_ROLE_COLORS[m.resort_role]}
                            >
                              {m.resort_name}: {m.resort_role.replace('_', ' ')}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {staff.global_role !== 'SUPER_ADMIN' && staff.memberships.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAccess(staff, staff.memberships[0].id)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Remove Access
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Users}
              title="No staff found"
              description={searchQuery ? "No staff match your search criteria" : "No staff members with resort access"}
            />
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Staff Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedStaff?.full_name}'s access?
              They will no longer be able to access the staff console for this resort.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmAction}
              disabled={removeMembershipMutation.isPending}
            >
              {removeMembershipMutation.isPending ? 'Removing...' : 'Remove Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
