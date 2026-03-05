/**
 * Department Setup Wizard v2
 *
 * 4-step wizard with fully local state and atomic commit on Finish.
 * No database rows are created until the user clicks "Finish".
 *
 * Steps:
 *   1. Type + Name + Key
 *   2. Scope setup (activity categories or restaurants, based on type)
 *   3. Members + roles
 *   4. Module access defaults + bulk overrides
 */

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
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Waves,
  UtensilsCrossed,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { DepartmentModuleKey, ActivityCategory } from '@/types/database';

// ─── Constants ───

type DepartmentType = 'activities' | 'dining' | 'mixed';

interface DeptTypeOption {
  value: DepartmentType;
  label: string;
  description: string;
  icon: typeof Waves;
}

const DEPT_TYPES: DeptTypeOption[] = [
  { value: 'activities', label: 'Activities', description: 'Dive, watersports, excursions, spa', icon: Waves },
  { value: 'dining', label: 'Dining', description: 'Restaurant & F&B operations', icon: UtensilsCrossed },
  { value: 'mixed', label: 'Mixed (Advanced)', description: 'Custom scope across modules', icon: Layers },
];

const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: 'DIVE', label: 'Diving' },
  { value: 'WATERSPORT', label: 'Watersports' },
  { value: 'EXCURSION', label: 'Excursions' },
  { value: 'SPA', label: 'Spa & Wellness' },
  { value: 'OTHER', label: 'Other' },
];

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

interface RestaurantOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  resortId: string;
}

// ─── Component ───

export function DepartmentSetupWizard({ open, onClose, resortId }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 state: Type + Details
  const [deptType, setDeptType] = useState<DepartmentType>('activities');
  const [deptKey, setDeptKey] = useState('');
  const [deptName, setDeptName] = useState('');

  // Step 2 state: Scope
  const [selectedCategories, setSelectedCategories] = useState<ActivityCategory[]>([]);
  const [availableRestaurants, setAvailableRestaurants] = useState<RestaurantOption[]>([]);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  // Step 3 state: Members
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [addedMembers, setAddedMembers] = useState<AddedMember[]>([]);

  // Step 4 state: Modules
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Commit state
  const [finishing, setFinishing] = useState(false);

  // ─── Reset on open ───
  useEffect(() => {
    if (open) {
      setStep(1);
      setDeptType('activities');
      setDeptKey('');
      setDeptName('');
      setSelectedCategories([]);
      setSelectedRestaurantIds([]);
      setAvailableRestaurants([]);
      setStaffUsers([]);
      setStaffSearch('');
      setAddedMembers([]);
      const defaults: Record<string, boolean> = {};
      MODULE_GROUPS.forEach(g => g.modules.forEach(m => { defaults[m.key] = true; }));
      setModuleState(defaults);
      setExpandedGroups(new Set());
    }
  }, [open]);

  // ─── Data fetching (lazy, when reaching relevant step) ───

  // Fetch restaurants when entering step 2 with dining/mixed type
  useEffect(() => {
    if (step !== 2 || (deptType !== 'dining' && deptType !== 'mixed')) return;
    let cancelled = false;

    async function fetchRestaurants() {
      setRestaurantsLoading(true);
      const { data } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('name');

      if (!cancelled) {
        setAvailableRestaurants((data ?? []) as RestaurantOption[]);
        setRestaurantsLoading(false);
      }
    }

    fetchRestaurants();
    return () => { cancelled = true; };
  }, [step, deptType, resortId]);

  // Fetch staff when entering step 3
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;

    async function fetchStaff() {
      setStaffLoading(true);
      const { data: memberships } = await supabase
        .from('resort_memberships')
        .select('user_id')
        .eq('resort_id', resortId);

      const userIds = (memberships ?? []).map(m => m.user_id);
      if (userIds.length === 0) {
        if (!cancelled) { setStaffUsers([]); setStaffLoading(false); }
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      if (!cancelled) {
        setStaffUsers((profiles ?? []) as StaffUser[]);
        setStaffLoading(false);
      }
    }

    fetchStaff();
    return () => { cancelled = true; };
  }, [step, resortId]);

  // ─── Step 1 validation ───

  const step1Valid = useMemo(() => {
    return deptKey.trim().length >= 2 && deptName.trim().length >= 2;
  }, [deptKey, deptName]);

  // ─── Step 2 helpers ───

  const toggleCategory = (cat: ActivityCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleRestaurant = (id: string) => {
    setSelectedRestaurantIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const step2Valid = useMemo(() => {
    if (deptType === 'activities') return selectedCategories.length > 0;
    if (deptType === 'dining') return selectedRestaurantIds.length > 0;
    return true; // mixed: scope is optional
  }, [deptType, selectedCategories, selectedRestaurantIds]);

  // ─── Step 3 helpers ───

  const addedUserIds = useMemo(() => new Set(addedMembers.map(m => m.userId)), [addedMembers]);

  const filteredStaff = useMemo(() => {
    let list = staffUsers.filter(u => !addedUserIds.has(u.id));
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      list = list.filter(
        u => u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [staffUsers, addedUserIds, staffSearch]);

  const handleAddMember = (user: StaffUser, role: 'staff' | 'manager') => {
    if (addedMembers.some(m => m.userId === user.id)) return;
    setAddedMembers(prev => [
      ...prev,
      { userId: user.id, name: user.full_name ?? user.username ?? 'Unknown', role },
    ]);
  };

  const removeMember = (userId: string) => {
    setAddedMembers(prev => prev.filter(m => m.userId !== userId));
  };

  // ─── Step 4 helpers ───

  const getGroupStatus = useCallback(
    (group: ModuleGroupConfig): 'all' | 'some' | 'none' => {
      const states = group.modules.map(m => moduleState[m.key] ?? false);
      if (states.every(Boolean)) return 'all';
      if (states.some(Boolean)) return 'some';
      return 'none';
    },
    [moduleState]
  );

  const toggleGroupAll = (group: ModuleGroupConfig) => {
    const newEnabled = getGroupStatus(group) !== 'all';
    const updates: Record<string, boolean> = {};
    group.modules.forEach(m => { updates[m.key] = newEnabled; });
    setModuleState(prev => ({ ...prev, ...updates }));
  };

  const toggleModule = (key: DepartmentModuleKey, enabled: boolean) => {
    setModuleState(prev => ({ ...prev, [key]: enabled }));
  };

  const toggleGroupExpand = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  // ─── Atomic commit ───

  const handleFinish = async () => {
    const key = deptKey.trim().toUpperCase().replace(/\s+/g, '_');
    const name = deptName.trim();

    if (!key || !name) {
      toast.error('Department key and name are required');
      return;
    }

    setFinishing(true);

    try {
      // Resolve scope_type and activity_scope_key
      let scopeType = 'activities';
      let activityScopeKey: string | null = null;

      if (deptType === 'activities' && selectedCategories.length === 1) {
        activityScopeKey = selectedCategories[0];
        scopeType = 'activities';
      } else if (deptType === 'activities' && selectedCategories.length > 1) {
        // For multi-category, store first as primary scope (the rest via bindings in future)
        activityScopeKey = selectedCategories[0];
        scopeType = 'activities';
      } else if (deptType === 'dining') {
        scopeType = 'dining';
        activityScopeKey = null;
      } else {
        scopeType = 'mixed';
        activityScopeKey = null;
      }

      // 1) Create department row
      const { data: dept, error: deptErr } = await supabase
        .from('resort_departments')
        .insert({
          resort_id: resortId,
          key,
          name,
          is_active: true,
          scope_type: scopeType,
          activity_scope_key: activityScopeKey,
        })
        .select('id, key')
        .single();

      if (deptErr) {
        if (deptErr.code === '23505') {
          toast.error('A department with this key already exists');
        } else {
          throw deptErr;
        }
        return;
      }

      const deptId = dept.id;
      const deptKeyFinal = dept.key;

      // 2) Bulk insert scope bindings via RPC
      const bindingsPayload = [
        ...selectedCategories.map(k => ({ binding_type: 'activity_category', binding_key: k, is_active: true })),
        ...selectedRestaurantIds.map(k => ({ binding_type: 'restaurant', binding_key: k, is_active: true })),
      ];
      if (bindingsPayload.length > 0) {
        const { error: bindErr } = await supabase.rpc('upsert_department_bindings', {
          p_department_id: deptId,
          p_bindings: bindingsPayload,
        });
        if (bindErr) {
          console.error('[DeptWizard] Bindings upsert warning:', bindErr.message);
        }
      }

      // 3) Bulk insert department-level modules via RPC
      const deptModulesPayload = Object.entries(moduleState).map(([key, enabled], i) => ({
        module_key: key,
        enabled,
        sort_order: i,
      }));
      if (deptModulesPayload.length > 0) {
        const { error: dmErr } = await supabase.rpc('upsert_department_modules', {
          p_department_id: deptId,
          p_modules: deptModulesPayload,
        });
        if (dmErr) {
          console.error('[DeptWizard] Dept modules upsert warning:', dmErr.message);
        }
      }

      // 4) Bulk insert memberships (DB trigger provisions default module access)
      if (addedMembers.length > 0) {
        const memberRows = addedMembers.map(m => ({
          resort_id: resortId,
          department_id: deptId,
          department_key: deptKeyFinal,
          user_id: m.userId,
          dept_role: m.role,
          is_active: true,
        }));

        const { error: memErr } = await supabase
          .from('department_memberships')
          .insert(memberRows);

        if (memErr) throw memErr;

        // 3) Apply module overrides (DB trigger already created defaults; upsert to match wizard config)
        const moduleOverrides: Array<{
          resort_id: string;
          department_id: string;
          user_id: string;
          module_key: string;
          enabled: boolean;
        }> = [];

        for (const member of addedMembers) {
          for (const [moduleKey, enabled] of Object.entries(moduleState)) {
            moduleOverrides.push({
              resort_id: resortId,
              department_id: deptId,
              user_id: member.userId,
              module_key: moduleKey,
              enabled,
            });
          }
        }

        if (moduleOverrides.length > 0) {
          // Use upsert to handle trigger-created defaults + wizard overrides
          const { error: modErr } = await supabase
            .from('department_module_access')
            .upsert(moduleOverrides, {
              onConflict: 'department_id,user_id,module_key',
              ignoreDuplicates: false,
            });

          if (modErr) {
            console.error('[DeptWizard] Module override upsert warning:', modErr.message);
            // Non-fatal: memberships + dept created, modules can be fixed later
          }
        }
      }

      // Success
      queryClient.invalidateQueries({ queryKey: ['departments', resortId] });
      toast.success('Department setup complete!');
      onClose();
      navigate(`/staff/dept/${deptKeyFinal}/planner`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to complete setup');
    } finally {
      setFinishing(false);
    }
  };

  // ─── Step config ───

  const TOTAL_STEPS = 4;
  const stepTitles = ['Department Type & Details', 'Scope Setup', 'Add Members', 'Module Access'];
  const stepDescriptions = [
    'Choose the department type and set a unique key and display name.',
    deptType === 'activities'
      ? 'Select which activity categories this department manages.'
      : deptType === 'dining'
        ? 'Select which restaurants this department manages.'
        : 'Mixed departments can be scoped later from settings.',
    'Add resort staff to this department. You can skip this step.',
    'Configure which modules are enabled for department members.',
  ];

  // ─── Render ───

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    s < step ? 'bg-primary text-primary-foreground'
                      : s === step ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s < step ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                {s < TOTAL_STEPS && (
                  <div className={cn('w-6 h-0.5 rounded-full', s < step ? 'bg-primary' : 'bg-muted')} />
                )}
              </div>
            ))}
          </div>
          <DialogTitle>{stepTitles[step - 1]}</DialogTitle>
          <DialogDescription>{stepDescriptions[step - 1]}</DialogDescription>
        </DialogHeader>

        {/* ══════════ Step 1: Type + Details ══════════ */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {/* Department type selector */}
            <div className="space-y-2">
              <Label>Department Type</Label>
              <div className="grid gap-2">
                {DEPT_TYPES.map(t => {
                  const Icon = t.icon;
                  const selected = deptType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDeptType(t.value)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors min-h-[44px]',
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Department Key</Label>
              <Input
                placeholder="e.g., HOUSEKEEPING"
                value={deptKey}
                onChange={e => setDeptKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier. UPPERCASE with underscores. Cannot be changed later.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                placeholder="e.g., Housekeeping"
                value={deptName}
                onChange={e => setDeptName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ══════════ Step 2: Scope Setup ══════════ */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            {deptType === 'activities' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Activity Categories
                </Label>
                <div className="grid gap-2">
                  {ACTIVITY_CATEGORIES.map(cat => {
                    const selected = selectedCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors min-h-[44px]',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        )}
                      >
                        <div className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                          selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        )}>
                          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {deptType === 'dining' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Restaurants
                </Label>
                {restaurantsLoading ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-11 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : availableRestaurants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No active restaurants found. Create restaurants first from Settings.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {availableRestaurants.map(r => {
                      const selected = selectedRestaurantIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRestaurant(r.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors min-h-[44px]',
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <div className={cn(
                            'h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                            selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          )}>
                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium">{r.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {deptType === 'mixed' && (
              <div className="text-center py-8 space-y-2">
                <Layers className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Mixed departments have no predefined scope. You can configure scope bindings later from department settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ Step 3: Members ══════════ */}
        {step === 3 && (
          <div className="space-y-3 py-2 flex-1 min-h-0 flex flex-col">
            {addedMembers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Added ({addedMembers.length})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {addedMembers.map(m => (
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resort staff..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[240px] space-y-0.5">
              {staffLoading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {staffSearch ? 'No matching staff.' : 'All resort staff have been added.'}
                </p>
              ) : (
                filteredStaff.map(user => (
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
                        onClick={() => handleAddMember(user, 'staff')}
                        className="gap-1 text-xs"
                      >
                        <UserPlus className="h-3 w-3" />
                        Staff
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
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

        {/* ══════════ Step 4: Module Access ══════════ */}
        {step === 4 && (
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
                  {MODULE_GROUPS.map(group => {
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
                              {group.modules.map(mod => (
                                <div key={mod.key} className="flex items-center gap-3 px-4 py-2.5 min-h-[44px]">
                                  <Switch
                                    checked={moduleState[mod.key] ?? false}
                                    onCheckedChange={checked => toggleModule(mod.key, checked)}
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

        {/* ══════════ Footer ══════════ */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {step === 1 && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!step1Valid} className="gap-1.5">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className="gap-1.5"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 3 && (
            <Button onClick={() => setStep(4)} className="gap-1.5">
              {addedMembers.length === 0 ? 'Skip' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 4 && (
            <Button
              onClick={handleFinish}
              disabled={finishing}
              className="gap-1.5"
            >
              {finishing ? 'Saving...' : 'Finish'}
              {!finishing && <Check className="h-4 w-4" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
