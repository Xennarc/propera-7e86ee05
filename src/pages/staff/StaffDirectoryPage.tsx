import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { ResortRole } from '@/types/database';
import { Users, Search, Building2, Mail, User } from 'lucide-react';
import { useState, useMemo } from 'react';

interface StaffMember {
  id: string;
  user_id: string;
  resort_role: ResortRole;
  department: string | null;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
}

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-primary/10 text-primary border-primary/30',
  MANAGER: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  FRONT_OFFICE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  RESERVATIONS: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  ACTIVITIES: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  FNB: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
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

import { ErrorBoundary } from '@/components/ui/error-boundary';

function StaffDirectoryPageContent() {
  const { currentResort } = useResort();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('__all__');
  const [departmentFilter, setDepartmentFilter] = useState<string>('__all__');

  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ['staff-directory', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data, error } = await supabase
        .from('resort_memberships')
        .select(`
          id,
          user_id,
          resort_role,
          department,
          profile:profiles!resort_memberships_user_id_fkey(
            id,
            full_name,
            username
          )
        `)
        .eq('resort_id', currentResort.id)
        .order('department', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as StaffMember[];
    },
    enabled: !!currentResort,
  });

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!staffMembers) return [];
    const depts = staffMembers
      .map(m => m.department)
      .filter((d): d is string => !!d);
    return [...new Set(depts)].sort();
  }, [staffMembers]);

  // Filter staff members
  const filteredMembers = useMemo(() => {
    if (!staffMembers) return [];
    
    return staffMembers.filter(member => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        member.profile?.full_name?.toLowerCase().includes(searchLower) ||
        member.profile?.username?.toLowerCase().includes(searchLower) ||
        member.department?.toLowerCase().includes(searchLower);
      
      // Role filter
      const matchesRole = roleFilter === '__all__' || member.resort_role === roleFilter;
      
      // Department filter
      const matchesDept = departmentFilter === '__all__' || member.department === departmentFilter;
      
      return matchesSearch && matchesRole && matchesDept;
    });
  }, [staffMembers, searchQuery, roleFilter, departmentFilter]);

  // Group by department
  const groupedMembers = useMemo(() => {
    const groups: Record<string, StaffMember[]> = {};
    
    filteredMembers.forEach(member => {
      const dept = member.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(member);
    });

    // Sort groups by department name
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [filteredMembers]);

  if (!currentResort) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Building2}
          title="No Resort Selected"
          description="Please select a resort from the sidebar to view the team directory."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Directory"
        description={`Staff members at ${currentResort.name}`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {departments.length > 0 && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredMembers.length === 0 && (
        <EmptyState
          icon={Users}
          title="No Team Members Found"
          description={searchQuery || roleFilter !== '__all__' || departmentFilter !== '__all__'
            ? "Try adjusting your search or filters."
            : "No staff members have been added to this resort yet."
          }
        />
      )}

      {/* Staff directory grouped by department */}
      {!isLoading && groupedMembers.map(([department, members]) => (
        <div key={department} className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {department}
            </h3>
            <span className="text-xs text-muted-foreground/60">
              ({members.length})
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const initials = member.profile?.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '??';

              return (
                <Card 
                  key={member.id} 
                  className={isCurrentUser ? 'ring-2 ring-primary/30' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-muted">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">
                            {member.profile?.full_name || 'Unknown'}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              You
                            </Badge>
                          )}
                        </div>
                        {member.profile?.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{member.profile.username}
                          </p>
                        )}
                        <div className="mt-2">
                          <Badge 
                            variant="outline" 
                            className={ROLE_COLORS[member.resort_role]}
                          >
                            {ROLE_LABELS[member.resort_role]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Summary */}
      {!isLoading && staffMembers && staffMembers.length > 0 && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {staffMembers.length} team member{staffMembers.length !== 1 ? 's' : ''} at {currentResort.name}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StaffDirectoryPage() {
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <StaffDirectoryPageContent />
    </ErrorBoundary>
  );
}
