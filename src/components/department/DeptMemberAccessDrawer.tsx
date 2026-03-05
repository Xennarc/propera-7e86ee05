import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, User, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DepartmentModuleKey } from '@/types/database';

interface DeptMember {
  id: string;
  user_id: string;
  dept_role: string;
  is_active: boolean;
  full_name: string | null;
  username: string | null;
}

interface ModuleGroupConfig {
  label: string;
  modules: { key: DepartmentModuleKey; label: string }[];
}

const MODULE_GROUPS: ModuleGroupConfig[] = [
  {
    label: 'Operations',
    modules: [
      { key: 'ops_planner', label: 'Ops Planner' },
      { key: 'master_ops_sheet', label: 'Master Ops Sheet' },
      { key: 'ops_inbox', label: 'Ops Inbox' },
      { key: 'session_run_sheet', label: 'Session Run Sheet' },
      { key: 'pickup_runs', label: 'Pickup Runs' },
    ],
  },
  {
    label: 'Resources',
    modules: [
      { key: 'resources_assets', label: 'Assets' },
      { key: 'resources_shifts', label: 'Shifts' },
      { key: 'resources_unavailability', label: 'Unavailability' },
    ],
  },
  {
    label: 'Compliance',
    modules: [
      { key: 'compliance_verify', label: 'Cert Verification' },
      { key: 'compliance_medical', label: 'Medical Review' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  member: DeptMember;
  departmentId: string;
  resortId: string;
  managerCount: number;
}

export function DeptMemberAccessDrawer({ open, onClose, member, departmentId, resortId, managerCount }: Props) {
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState(member.dept_role);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isManager = role === 'manager' || role === 'MANAGER';
  const isLastManager = isManager && managerCount <= 1;

  // Fetch current module access
  useEffect(() => {
    if (!open) return;
    setRole(member.dept_role);
    
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('department_module_access')
        .select('module_key, enabled')
        .eq('department_id', departmentId)
        .eq('user_id', member.user_id);

      const state: Record<string, boolean> = {};
      (data ?? []).forEach(row => {
        state[row.module_key] = row.enabled;
      });
      setModuleState(state);
      setLoading(false);
    }
    fetch();
  }, [open, member.user_id, departmentId]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupLabel) ? next.delete(groupLabel) : next.add(groupLabel);
      return next;
    });
  };

  const getGroupStatus = (group: ModuleGroupConfig): 'all' | 'some' | 'none' => {
    const states = group.modules.map(m => moduleState[m.key] ?? false);
    if (states.every(Boolean)) return 'all';
    if (states.some(Boolean)) return 'some';
    return 'none';
  };

  const toggleGroupAll = async (group: ModuleGroupConfig) => {
    const currentStatus = getGroupStatus(group);
    const newEnabled = currentStatus !== 'all';

    const updates: Record<string, boolean> = {};
    group.modules.forEach(m => { updates[m.key] = newEnabled; });
    setModuleState(prev => ({ ...prev, ...updates }));

    // Persist each module toggle
    for (const mod of group.modules) {
      await upsertModuleAccess(mod.key, newEnabled);
    }
  };

  const toggleModule = async (key: DepartmentModuleKey, enabled: boolean) => {
    setModuleState(prev => ({ ...prev, [key]: enabled }));
    await upsertModuleAccess(key, enabled);
  };

  const upsertModuleAccess = async (moduleKey: string, enabled: boolean) => {
    // Check if row exists
    const { data: existing } = await supabase
      .from('department_module_access')
      .select('id')
      .eq('department_id', departmentId)
      .eq('user_id', member.user_id)
      .eq('module_key', moduleKey)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('department_module_access')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('department_module_access')
        .insert({
          resort_id: resortId,
          department_id: departmentId,
          user_id: member.user_id,
          module_key: moduleKey,
          enabled,
        });
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (isLastManager && newRole === 'staff') {
      toast.error('Cannot demote the last manager. Promote another member first.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('department_memberships')
      .update({ dept_role: newRole })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to update role');
    } else {
      setRole(newRole);
      toast.success(`Role updated to ${newRole}`);

      // If promoted to manager, enable all modules
      if (newRole === 'manager') {
        const allModules: Record<string, boolean> = {};
        MODULE_GROUPS.forEach(g => g.modules.forEach(m => { allModules[m.key] = true; }));
        setModuleState(allModules);
        for (const key of Object.keys(allModules)) {
          await upsertModuleAccess(key, true);
        }
      }
    }
    setSaving(false);
  };

  const handleRemoveMember = async () => {
    if (isLastManager) {
      toast.error('Cannot remove the last manager.');
      setRemoveDialogOpen(false);
      return;
    }

    setRemoving(true);
    const { error } = await supabase
      .from('department_memberships')
      .update({ is_active: false })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to remove member');
    } else {
      toast.success('Member removed from department');
      onClose();
    }
    setRemoving(false);
    setRemoveDialogOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {isManager ? <Shield className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base truncate">{member.full_name ?? member.username ?? 'Unknown'}</SheetTitle>
                {member.username && member.full_name && (
                  <p className="text-xs text-muted-foreground">@{member.username}</p>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Role toggle */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
              <div className="flex gap-2">
                {(['staff', 'manager'] as const).map(r => (
                  <Button
                    key={r}
                    variant={role === r ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 capitalize"
                    disabled={saving || (r === 'staff' && isLastManager)}
                    onClick={() => handleRoleChange(r)}
                  >
                    {r === 'manager' && <Shield className="h-3.5 w-3.5 mr-1.5" />}
                    {r}
                  </Button>
                ))}
              </div>
              {isLastManager && (
                <p className="text-xs text-warning">This is the only manager. Promote another member before demoting.</p>
              )}
            </div>

            <Separator />

            {/* Module groups */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Access</label>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {MODULE_GROUPS.map(group => {
                    const status = getGroupStatus(group);
                    const isExpanded = expandedGroups.has(group.label);

                    return (
                      <Collapsible key={group.label} open={isExpanded} onOpenChange={() => toggleGroup(group.label)}>
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                          {/* Group header */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                            <Switch
                              checked={status === 'all'}
                              // indeterminate state shown via badge
                              onCheckedChange={() => toggleGroupAll(group)}
                              className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{group.label}</span>
                              {status === 'some' && (
                                <Badge variant="outline" className="ml-2 text-[10px] py-0">Partial</Badge>
                              )}
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>

                          {/* Individual modules */}
                          <CollapsibleContent>
                            <div className="border-t border-border/30">
                              {group.modules.map(mod => (
                                <div key={mod.key} className="flex items-center gap-3 px-4 py-2.5 min-h-[44px]">
                                  <Switch
                                    checked={moduleState[mod.key] ?? false}
                                    onCheckedChange={(checked) => toggleModule(mod.key, checked)}
                                    className="shrink-0"
                                  />
                                  <span className="text-sm">{mod.label}</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/30 px-5 py-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              disabled={isLastManager}
              onClick={() => setRemoveDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Remove from Department
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{member.full_name ?? member.username}</strong> from this department? They will lose all department module access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
