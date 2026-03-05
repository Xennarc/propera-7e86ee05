import { useState, useEffect, useMemo, useCallback } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, AlertTriangle, Save, Layers, PackageCheck, Sparkles, Eye } from 'lucide-react';
import type { DepartmentModuleKey } from '@/types/database';
import { ALL_DEPARTMENT_MODULES, MODULE_GROUPS, DEPARTMENT_TEMPLATES, type DeptTemplate } from '@/lib/departments/module-definitions';

const ACTIVITY_CATEGORIES = [
  { value: 'DIVE', label: 'Dive' },
  { value: 'WATERSPORT', label: 'Watersports' },
  { value: 'EXCURSION', label: 'Excursions' },
  { value: 'SPA', label: 'Spa' },
  { value: 'OTHER', label: 'Other' },
];

function DeptSettingsContent() {
  const { currentDepartment, bindings, scope } = useDepartment();
  const queryClient = useQueryClient();

  // ── Profile state ──
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Scope bindings state ──
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [bindingsDirty, setBindingsDirty] = useState(false);
  const [bindingsSaving, setBindingsSaving] = useState(false);

  // ── Module state ──
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>({});
  const [modulesDirty, setModulesDirty] = useState(false);
  const [modulesSaving, setModulesSaving] = useState(false);

  // Fetch department-level modules
  const { data: deptModules = [] } = useQuery({
    queryKey: ['department-modules', currentDepartment?.id],
    queryFn: async () => {
      if (!currentDepartment) return [];
      const { data } = await supabase
        .from('department_modules')
        .select('*')
        .eq('department_id', currentDepartment.id);
      return data ?? [];
    },
    enabled: !!currentDepartment,
  });

  // Fetch restaurants for dining scope
  const { data: restaurants = [] } = useQuery({
    queryKey: ['resort-restaurants', currentDepartment?.resort_id],
    queryFn: async () => {
      if (!currentDepartment) return [];
      const { data } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('resort_id', currentDepartment.resort_id)
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
    enabled: !!currentDepartment,
  });

  // Sync profile state
  useEffect(() => {
    if (currentDepartment) {
      setName(currentDepartment.name);
      setIsActive(currentDepartment.is_active);
      setDirty(false);
    }
  }, [currentDepartment]);

  // Sync bindings state
  useEffect(() => {
    const cats = bindings
      .filter(b => b.binding_type === 'activity_category' && b.is_active)
      .map(b => b.binding_key);
    const rests = bindings
      .filter(b => b.binding_type === 'restaurant' && b.is_active)
      .map(b => b.binding_key);
    setSelectedCategories(cats);
    setSelectedRestaurants(rests);
    setBindingsDirty(false);
  }, [bindings]);

  // Sync module state
  useEffect(() => {
    const toggles: Record<string, boolean> = {};
    for (const mod of ALL_DEPARTMENT_MODULES) {
      const dbMod = deptModules.find((m: any) => m.module_key === mod.key);
      toggles[mod.key] = dbMod ? dbMod.enabled : true; // default enabled if no row
    }
    setModuleToggles(toggles);
    setModulesDirty(false);
  }, [deptModules]);

  // ── Handlers ──

  const handleSaveProfile = async () => {
    if (!currentDepartment) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_department_profile', {
        p_department_id: currentDepartment.id,
        p_name: name.trim() || null,
        p_is_active: isActive,
      });
      if (error) throw error;
      toast.success('Profile saved');
      queryClient.invalidateQueries({ queryKey: ['department'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBindings = async () => {
    if (!currentDepartment) return;
    setBindingsSaving(true);
    try {
      const payload = [
        ...selectedCategories.map(k => ({ binding_type: 'activity_category', binding_key: k, is_active: true })),
        ...selectedRestaurants.map(k => ({ binding_type: 'restaurant', binding_key: k, is_active: true })),
      ];
      const { error } = await supabase.rpc('upsert_department_bindings', {
        p_department_id: currentDepartment.id,
        p_bindings: payload,
      });
      if (error) throw error;
      toast.success('Scope bindings saved');
      queryClient.invalidateQueries({ queryKey: ['department'] });
      queryClient.invalidateQueries({ queryKey: ['dept-'] });
      setBindingsDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bindings');
    } finally {
      setBindingsSaving(false);
    }
  };

  const handleSaveModules = async () => {
    if (!currentDepartment) return;
    setModulesSaving(true);
    try {
      const payload = ALL_DEPARTMENT_MODULES.map((mod, i) => ({
        module_key: mod.key,
        enabled: moduleToggles[mod.key] ?? true,
        sort_order: i,
      }));
      const { error } = await supabase.rpc('upsert_department_modules', {
        p_department_id: currentDepartment.id,
        p_modules: payload,
      });
      if (error) throw error;
      toast.success('Modules saved');
      queryClient.invalidateQueries({ queryKey: ['department-modules'] });
      setModulesDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save modules');
    } finally {
      setModulesSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!currentDepartment) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_department_profile', {
        p_department_id: currentDepartment.id,
        p_is_active: false,
      });
      if (error) throw error;
      toast.success('Department deactivated');
      setIsActive(false);
      queryClient.invalidateQueries({ queryKey: ['department'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setBindingsDirty(true);
  };

  const toggleRestaurant = (id: string) => {
    setSelectedRestaurants(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
    setBindingsDirty(true);
  };

  const toggleModule = (key: string) => {
    setModuleToggles(prev => ({ ...prev, [key]: !prev[key] }));
    setModulesDirty(true);
  };

  const applyTemplate = (templateKey: DeptTemplate) => {
    const template = DEPARTMENT_TEMPLATES.find(t => t.key === templateKey);
    if (!template) return;
    const newToggles: Record<string, boolean> = {};
    for (const mod of ALL_DEPARTMENT_MODULES) {
      newToggles[mod.key] = template.enabledModules.includes(mod.key);
    }
    setModuleToggles(newToggles);
    setModulesDirty(true);
    if (template.suggestedCategories.length > 0) {
      setSelectedCategories(template.suggestedCategories);
      setBindingsDirty(true);
    }
    toast.info(`Applied "${template.label}" template`);
  };

  const scopePreview = useMemo(() => {
    const parts: string[] = [];
    if (selectedCategories.length > 0) {
      parts.push(`${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}`);
    }
    if (selectedRestaurants.length > 0) {
      parts.push(`${selectedRestaurants.length} restaurant${selectedRestaurants.length === 1 ? '' : 's'}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'No scope configured — all sessions shown';
  }, [selectedCategories, selectedRestaurants]);

  const enabledModuleCount = Object.values(moduleToggles).filter(Boolean).length;
  const anyDirty = dirty || bindingsDirty || modulesDirty;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Department Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentDepartment?.name} · {currentDepartment?.key}</p>
        </div>
      </div>

      {/* A) Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription className="text-xs">Basic department information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dept-key" className="text-xs font-medium">Department Key</Label>
            <Input id="dept-key" value={currentDepartment?.key ?? ''} disabled className="text-xs bg-muted/50" />
            <p className="text-[11px] text-muted-foreground">Immutable identifier used in URLs</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-name" className="text-xs font-medium">Display Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={e => { setName(e.target.value); setDirty(true); }}
              className="text-xs"
              placeholder="e.g. Dive Center"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Active</Label>
              <p className="text-[11px] text-muted-foreground">Inactive departments are hidden from staff</p>
            </div>
            <Switch checked={isActive} onCheckedChange={v => { setIsActive(v); setDirty(true); }} />
          </div>
          {dirty && (
            <Button size="sm" className="text-xs gap-1.5" onClick={handleSaveProfile} disabled={saving}>
              <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save Profile'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* B) Scope Bindings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Scope Bindings
          </CardTitle>
          <CardDescription className="text-xs">Define which sessions and entities this department manages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Activity Categories */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Activity Categories</Label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_CATEGORIES.map(cat => (
                <label
                  key={cat.value}
                  className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedCategories.includes(cat.value)}
                    onCheckedChange={() => toggleCategory(cat.value)}
                  />
                  <span className="text-xs font-medium">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Restaurants */}
          {restaurants.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-medium">Restaurants</Label>
              <div className="grid grid-cols-2 gap-2">
                {restaurants.map((r: any) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedRestaurants.includes(r.id)}
                      onCheckedChange={() => toggleRestaurant(r.id)}
                    />
                    <span className="text-xs font-medium">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Preview */}
          <div className="rounded-md bg-muted/50 p-3 flex items-start gap-2">
            <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium">Scope Preview</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                This department will see: <span className="font-medium text-foreground">{scopePreview}</span>
              </p>
            </div>
          </div>

          {bindingsDirty && (
            <Button size="sm" className="text-xs gap-1.5" onClick={handleSaveBindings} disabled={bindingsSaving}>
              <Save className="h-3.5 w-3.5" />{bindingsSaving ? 'Saving…' : 'Save Bindings'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* C) Modules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-4 w-4" />
                Modules
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {enabledModuleCount} of {ALL_DEPARTMENT_MODULES.length} modules enabled
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Templates */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Quick Templates
            </Label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENT_TEMPLATES.map(t => (
                <Button
                  key={t.key}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => applyTemplate(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Module toggles by group */}
          {MODULE_GROUPS.map(group => {
            const groupModules = ALL_DEPARTMENT_MODULES.filter(m => m.group === group.key);
            return (
              <div key={group.key} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                <div className="space-y-1">
                  {groupModules.map(mod => (
                    <div
                      key={mod.key}
                      className="flex items-center justify-between rounded-md border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{mod.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{mod.description}</p>
                      </div>
                      <Switch
                        checked={moduleToggles[mod.key] ?? true}
                        onCheckedChange={() => toggleModule(mod.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="rounded-md bg-muted/40 p-2.5">
            <p className="text-[11px] text-muted-foreground">
              Disabling a module at department level hides it for all members, regardless of individual user-level access.
            </p>
          </div>

          {modulesDirty && (
            <Button size="sm" className="text-xs gap-1.5" onClick={handleSaveModules} disabled={modulesSaving}>
              <Save className="h-3.5 w-3.5" />{modulesSaving ? 'Saving…' : 'Save Modules'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deactivate Department</p>
              <p className="text-[11px] text-muted-foreground">
                Hides this department from all staff. Members will lose access.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="text-xs" disabled={!isActive}>
                  Deactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate "{currentDepartment?.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the department from all staff members. Members will lose access to department modules.
                    You can reactivate it later from resort settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptSettingsPage() {
  return (
    <DepartmentGuard managerOnly>
      <DeptSettingsContent />
    </DepartmentGuard>
  );
}
