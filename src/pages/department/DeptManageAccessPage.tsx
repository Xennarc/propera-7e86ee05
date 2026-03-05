import { useState, useEffect, useMemo } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserPlus, Shield, User, Pencil } from 'lucide-react';
import { DeptMemberAccessDrawer } from '@/components/department/DeptMemberAccessDrawer';
import { DeptAddMemberDialog } from '@/components/department/DeptAddMemberDialog';
import { toast } from 'sonner';

interface DeptMember {
  id: string;
  user_id: string;
  dept_role: string;
  is_active: boolean;
  full_name: string | null;
  username: string | null;
}

function DeptManageAccessContent() {
  const { currentDepartment, isManager } = useDepartment();
  const [members, setMembers] = useState<DeptMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<DeptMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchMembers = async () => {
    if (!currentDepartment) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('department_memberships')
        .select('id, user_id, dept_role, is_active')
        .eq('department_id', currentDepartment.id)
        .eq('is_active', true);

      if (error) throw error;

      // Fetch profiles for these users
      const userIds = (data ?? []).map(m => m.user_id);
      let profiles: Record<string, { full_name: string | null; username: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);

        (profileData ?? []).forEach(p => {
          profiles[p.id] = { full_name: p.full_name, username: p.username };
        });
      }

      setMembers((data ?? []).map(m => ({
        ...m,
        full_name: profiles[m.user_id]?.full_name ?? null,
        username: profiles[m.user_id]?.username ?? null,
      })));
    } catch (err) {
      toast.error('Failed to load department members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentDepartment?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      (m.full_name?.toLowerCase().includes(q)) ||
      (m.username?.toLowerCase().includes(q))
    );
  }, [members, search]);

  const managerCount = members.filter(m => m.dept_role === 'manager' || m.dept_role === 'MANAGER').length;

  const handleEditAccess = (member: DeptMember) => {
    setSelectedMember(member);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedMember(null);
    // Refresh members list
    fetchMembers();
  };

  const handleMemberAdded = () => {
    setAddDialogOpen(false);
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Access</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentDepartment?.name} — {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Member</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Member list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              {search ? 'No members match your search.' : 'No members in this department yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const isManagerRole = member.dept_role === 'manager' || member.dept_role === 'MANAGER';
            return (
              <Card key={member.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {isManagerRole ? (
                      <Shield className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <User className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {member.full_name ?? member.username ?? 'Unknown'}
                    </div>
                    {member.username && member.full_name && (
                      <div className="text-xs text-muted-foreground truncate">@{member.username}</div>
                    )}
                  </div>
                  <Badge
                    variant={isManagerRole ? 'default' : 'secondary'}
                    className="shrink-0 text-xs"
                  >
                    {isManagerRole ? 'Manager' : 'Staff'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => handleEditAccess(member)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Access editor drawer */}
      {selectedMember && (
        <DeptMemberAccessDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          member={selectedMember}
          departmentId={currentDepartment!.id}
          resortId={currentDepartment!.resort_id}
          managerCount={managerCount}
        />
      )}

      {/* Add member dialog */}
      <DeptAddMemberDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdded={handleMemberAdded}
        departmentId={currentDepartment!.id}
        departmentKey={currentDepartment!.key}
        resortId={currentDepartment!.resort_id}
        existingUserIds={members.map(m => m.user_id)}
      />
    </div>
  );
}

export default function DeptManageAccessPage() {
  return (
    <DepartmentGuard managerOnly>
      <DeptManageAccessContent />
    </DepartmentGuard>
  );
}
