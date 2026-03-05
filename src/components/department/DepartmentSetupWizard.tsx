import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  Shield,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DepartmentModuleKey } from '@/types/database';

// ─── Module config (shared with DeptMemberAccessDrawer) ───

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

// Default modules for staff role (matches DB trigger)
const STAFF_DEFAULT_MODULES: DepartmentModuleKey[] = [
  'ops_planner',
  'master_ops_sheet',
  'ops_inbox',
  'session_run_sheet',
];

// ─── Types ───

interface StaffUser {
  id: string;
  full_name: string | null;
  username: string | null;
}

interface AddedMember {
  userId: string;
  name: string;
  role: 'staff' | 'manager';
}

interface Props {
  open: boolean;
  onClose: () => void;
  resortId: string;
}

// ─── Component ───

export function DepartmentSetupWizard({ open, onClose, resortId }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [deptKey, setDeptKey] = useState('');
  const [deptName, setDeptName] = useState('');
  const [createdDeptId, setCreatedDeptId] = useState<string | null>(null);
  const [createdDeptKey, setCreatedDeptKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Step 2 state
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [addedMembers, setAddedMembers] = useState<AddedMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);

  // Step 3 state
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep(1);
      setDeptKey('');
      setDeptName('');
      setCreatedDeptId(null);
      setCreatedDeptKey(null);
      setStaffUsers([]);
      setStaffSearch('');
      setAddedMembers([]);
      // Default all modules ON
      const defaults: Record<string, boolean> = {};
      MODULE_GROUPS.forEach((g) => g.modules.forEach((m) => { defaults[m.key] = true; }));
      setModuleState(defaults);
      setExpandedGroups(new Set());
    }
  }, [open]);

  // ─── Step 1: Create Department ───

  const handleCreateDept = async () => {
    const key = deptKey.trim().toUpperCase().replace(/\s+/g, '_');
    const name = deptName.trim();
    if (!key) { toast.error('Department key is required'); return; }
    if (!name) { toast.error('Department name is required'); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ resort_id: resortId, key, name, is_active: true })
        .select('id, key')
        .single();

      if (error) throw error;
      setCreatedDeptId(data.id);
      setCreatedDeptKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['departments', resortId] });
      toast.success('Department created');
      setStep(2);
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.error('A department with this key already exists');
      } else {
        toast.error(err?.message ?? 'Failed to create department');
      }
    } finally {
      setCreating(false);
    }
  };

  // ─── Step 2: Add Members ───

  useEffect(() => {
    if (step !== 2 || !createdDeptId) return;

    async function fetchStaff() {
      setStaffLoading(true);
      const { data: memberships } = await supabase
        .from('resort_memberships')
        .select('user_id')
        .eq('resort_id', resortId);

      const userIds = (memberships ?? []).map((m) => m.user_id);
      if (userIds.length === 0) {
        setStaffUsers([]);
        setStaffLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      setStaffUsers((profiles ?? []) as StaffUser[]);
      setStaffLoading(false);
    }

    fetchStaff();
  }, [step, createdDeptId, resortId]);

  const addedUserIds = useMemo(() => new Set(addedMembers.map((m) => m.userId)), [addedMembers]);

  const filteredStaff = useMemo(() => {
    let list = staffUsers.filter((u) => !addedUserIds.has(u.id));
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      list = list.filter(
        (u) => u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [staffUsers, addedUserIds, staffSearch]);

  const handleAddMember = async (user: StaffUser, role: 'staff' | 'manager') => {
    if (!createdDeptId || !createdDeptKey) return;
    setAddingMember(true);
    try {
      const { error } = await supabase.from('department_memberships').insert({
        resort_id: resortId,
        department_id: createdDeptId,
        department_key: createdDeptKey,
        user_id: user.id,
        dept_role: role,
        is_active: true,
      });
      if (error) throw error;

      setAddedMembers((prev) => [
        ...prev,
        { userId: user.id, name: user.full_name ?? user.username ?? 'Unknown', role },
      ]);
    } catch (err: any) {
      toast.error(err?.code === '23505' ? 'Already a member' : 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = (userId: string) => {
    setAddedMembers((prev) => prev.filter((m) => m.userId !== userId));
    // Note: the DB row from the trigger still exists; we leave it for now (admin can manage later)
  };

  // ─── Step 3: Module Access ───

  const getGroupStatus = useCallback(
    (group: ModuleGroupConfig): 'all' | 'some' | 'none' => {
      const states = group.modules.map((m) => moduleState[m.key] ?? false);
      if (states.every(Boolean)) return 'all';
      if (states.some(Boolean)) return 'some';
      return 'none';
    },
    [moduleState]
  );

  const toggleGroupAll = (group: ModuleGroupConfig) => {
    const newEnabled = getGroupStatus(group) !== 'all';
    const updates: Record<string, boolean> = {};
    group.modules.forEach((m) => { updates[m.key] = newEnabled; });
    setModuleState((prev) => ({ ...prev, ...updates }));
  };

  const toggleModule = (key: DepartmentModuleKey, enabled: boolean) => {
    setModuleState((prev) => ({ ...prev, [key]: enabled }));
  };

  const toggleGroupExpand = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleFinish = async () => {
    if (!createdDeptId) return;
    setFinishing(true);

    try {
      // For each added member, upsert module access based on the wizard config
      for (const member of addedMembers) {
        const enabledModules = Object.entries(moduleState);
        for (const [moduleKey, enabled] of enabledModules) {
          // Check if row exists (created by DB trigger)
          const { data: existing } = await supabase
            .from('department_module_access')
            .select('id')
            .eq('department_id', createdDeptId)
            .eq('user_id', member.userId)
            .eq('module_key', moduleKey)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('department_module_access')
              .update({ enabled, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          } else {
            await supabase.from('department_module_access').insert({
              resort_id: resortId,
              department_id: createdDeptId,
              user_id: member.userId,
              module_key: moduleKey,
              enabled,
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['departments', resortId] });
      toast.success('Department setup complete!');
      onClose();
    } catch (err: any) {
      toast.error('Failed to configure module access');
    } finally {
      setFinishing(false);
    }
  };

  // ─── Render ───

  const stepTitles = ['Department Details', 'Add Members', 'Module Access'];
  const stepDescriptions = [
    'Set a unique key and display name for the department.',
    'Add resort staff to this department. You can skip this step.',
    'Configure which modules are enabled for department members.',
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    s < step
                      ? 'bg-primary text-primary-foreground'
                      : s === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s < step ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                {s < 3 && (
                  <div className={cn('w-8 h-0.5 rounded-full', s < step ? 'bg-primary' : 'bg-muted')} />
                )}
              </div>
            ))}
          </div>
          <DialogTitle>{stepTitles[step - 1]}</DialogTitle>
          <DialogDescription>{stepDescriptions[step - 1]}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Department Key</Label>
              <Input
                placeholder="e.g., HOUSEKEEPING"
                value={deptKey}
                onChange={(e) => setDeptKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier. Use UPPERCASE with underscores. Cannot be changed later.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                placeholder="e.g., Housekeeping"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Members */}
        {step === 2 && (
          <div className="space-y-3 py-2 flex-1 min-h-0 flex flex-col">
            {/* Added members list */}
            {addedMembers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Added ({addedMembers.length})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {addedMembers.map((m) => (
                    <Badge key={m.userId} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                      {m.role === 'manager' && <Shield className="h-3 w-3 text-primary" />}
                      {m.name}
                      <span className="text-[10px] text-muted-foreground capitalize">({m.role})</span>
                      <button
                        onClick={() => removeMember(m.userId)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resort staff..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Staff list */}
            <div className="flex-1 overflow-y-auto max-h-[240px] space-y-0.5">
              {staffLoading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {staffSearch ? 'No matching staff.' : 'All resort staff have been added.'}
                </p>
              ) : (
                filteredStaff.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {user.full_name ?? user.username ?? 'Unknown'}
                      </div>
                      {user.username && user.full_name && (
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={addingMember}
                        onClick={() => handleAddMember(user, 'staff')}
                        className="gap-1 text-xs"
                      >
                        <UserPlus className="h-3 w-3" />
                        Staff
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={addingMember}
                        onClick={() => handleAddMember(user, 'manager')}
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
          </div>
        )}

        {/* Step 3: Module Access */}
        {step === 3 && (
          <div className="space-y-3 py-2 flex-1 overflow-y-auto max-h-[360px]">
            {addedMembers.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No members were added. Module access can be configured later from the department portal.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  These settings apply to all {addedMembers.length} member{addedMembers.length !== 1 ? 's' : ''} added in the previous step.
                </p>
                <div className="space-y-2">
                  {MODULE_GROUPS.map((group) => {
                    const status = getGroupStatus(group);
                    const isExpanded = expandedGroups.has(group.label);

                    return (
                      <Collapsible key={group.label} open={isExpanded} onOpenChange={() => toggleGroupExpand(group.label)}>
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                          <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                            <Switch
                              checked={status === 'all'}
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
                          <CollapsibleContent>
                            <div className="border-t border-border/30">
                              {group.modules.map((mod) => (
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
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {step === 1 && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreateDept} disabled={creating} className="gap-1.5">
                {creating ? 'Creating...' : 'Next'}
                {!creating && <ArrowRight className="h-4 w-4" />}
              </Button>
            </>
          )}

          {step === 2 && (
            <Button onClick={() => setStep(3)} className="gap-1.5">
              {addedMembers.length === 0 ? 'Skip' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 3 && (
            <Button
              onClick={addedMembers.length > 0 ? handleFinish : () => onClose()}
              disabled={finishing}
              className="gap-1.5"
            >
              {finishing ? 'Saving...' : addedMembers.length > 0 ? 'Finish' : 'Done'}
              {!finishing && <Check className="h-4 w-4" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
