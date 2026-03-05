import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, UserPlus, Shield } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  departmentId: string;
  departmentKey: string;
  resortId: string;
  existingUserIds: string[];
}

interface StaffUser {
  id: string;
  full_name: string | null;
  username: string | null;
}

export function DeptAddMemberDialog({ open, onClose, onAdded, departmentId, departmentKey, resortId, existingUserIds }: Props) {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    
    async function fetchStaff() {
      setLoading(true);
      const { data: membershipData } = await supabase
        .from('resort_memberships')
        .select('user_id')
        .eq('resort_id', resortId);

      const userIds = (membershipData ?? [])
        .map(m => m.user_id)
        .filter(id => !existingUserIds.includes(id));

      if (userIds.length === 0) {
        setStaffUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      setStaffUsers((profiles ?? []) as StaffUser[]);
      setLoading(false);
    }

    fetchStaff();
  }, [open, resortId, existingUserIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return staffUsers;
    const q = search.toLowerCase();
    return staffUsers.filter(u =>
      u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    );
  }, [staffUsers, search]);

  const handleAdd = async (user: StaffUser, role: 'staff' | 'manager') => {
    setAdding(user.id);
    try {
      // Check for existing inactive membership to reactivate
      const { data: existing } = await supabase
        .from('department_memberships')
        .select('id, dept_role, is_active')
        .eq('department_id', departmentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing && !existing.is_active) {
        // Reactivate + update role
        const { error } = await supabase
          .from('department_memberships')
          .update({ is_active: true, dept_role: role })
          .eq('id', existing.id);
        if (error) throw error;

        // Re-provision module access (trigger only fires on INSERT, so do it manually)
        const { data: accessRows } = await supabase
          .from('department_module_access')
          .select('id')
          .eq('department_id', departmentId)
          .eq('user_id', user.id);

        if (accessRows && accessRows.length > 0) {
          // Re-enable all for managers, core set for staff
          const coreModules = ['ops_planner', 'master_ops_sheet', 'ops_inbox', 'session_run_sheet'];
          for (const row of accessRows) {
            // We need the module_key to decide, so fetch it
          }
          // Simpler: just re-enable based on role
          if (role === 'manager') {
            await supabase
              .from('department_module_access')
              .update({ enabled: true, updated_at: new Date().toISOString() })
              .eq('department_id', departmentId)
              .eq('user_id', user.id);
          } else {
            // Disable all first, then enable core
            await supabase
              .from('department_module_access')
              .update({ enabled: false, updated_at: new Date().toISOString() })
              .eq('department_id', departmentId)
              .eq('user_id', user.id);
            await supabase
              .from('department_module_access')
              .update({ enabled: true, updated_at: new Date().toISOString() })
              .eq('department_id', departmentId)
              .eq('user_id', user.id)
              .in('module_key', coreModules);
          }
        }

        toast.success(`${user.full_name ?? user.username} re-added as ${role}`);
      } else if (existing && existing.is_active) {
        toast.error('This user is already a member');
        setAdding(null);
        return;
      } else {
        // Fresh insert — DB trigger handles module access defaults
        const { error } = await supabase
          .from('department_memberships')
          .insert({
            resort_id: resortId,
            department_id: departmentId,
            department_key: departmentKey,
            user_id: user.id,
            dept_role: role,
            is_active: true,
          });
        if (error) throw error;
        toast.success(`${user.full_name ?? user.username} added as ${role}`);
      }

      onAdded();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add member');
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Department Member</DialogTitle>
          <DialogDescription>Select a resort staff member and choose their role.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'No staff members match your search.' : 'All resort staff are already members.'}
            </p>
          ) : (
            filtered.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.full_name ?? user.username ?? 'Unknown'}</div>
                  {user.username && user.full_name && (
                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={adding === user.id}
                    onClick={() => handleAdd(user, 'staff')}
                    className="gap-1 text-xs"
                  >
                    <UserPlus className="h-3 w-3" />
                    Staff
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={adding === user.id}
                    onClick={() => handleAdd(user, 'manager')}
                    className="gap-1 text-xs"
                  >
                    <Shield className="h-3 w-3" />
                    Manager
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
