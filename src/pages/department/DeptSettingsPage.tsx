import { useState, useEffect } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, AlertTriangle, Save } from 'lucide-react';

const SCOPE_OPTIONS = [
  { value: '', label: 'None (show all sessions)' },
  { value: 'DIVE', label: 'Dive' },
  { value: 'WATERSPORT', label: 'Watersports' },
  { value: 'EXCURSION', label: 'Excursions' },
  { value: 'SPA', label: 'Spa' },
  { value: 'OTHER', label: 'Other' },
];

function DeptSettingsContent() {
  const { currentDepartment } = useDepartment();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [activityScopeKey, setActivityScopeKey] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync from currentDepartment
  useEffect(() => {
    if (currentDepartment) {
      setName(currentDepartment.name);
      setActivityScopeKey(currentDepartment.activity_scope_key ?? '');
      setIsActive(currentDepartment.is_active);
      setDirty(false);
    }
  }, [currentDepartment]);

  const handleSave = async () => {
    if (!currentDepartment) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_department_settings', {
        p_department_id: currentDepartment.id,
        p_name: name.trim() || null,
        p_is_active: isActive,
        p_activity_scope_key: activityScopeKey || null,
      });
      if (error) throw error;
      toast.success('Department settings saved');
      queryClient.invalidateQueries({ queryKey: ['department'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!currentDepartment) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_department_settings', {
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

  const markDirty = () => setDirty(true);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Department Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentDepartment?.name}</p>
        </div>
      </div>

      {/* A) Department Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Department Profile</CardTitle>
          <CardDescription className="text-xs">Basic department information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dept-key" className="text-xs font-medium">Department Key</Label>
            <Input
              id="dept-key"
              value={currentDepartment?.key ?? ''}
              disabled
              className="text-xs bg-muted/50"
            />
            <p className="text-[11px] text-muted-foreground">Immutable identifier used in URLs</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-name" className="text-xs font-medium">Display Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => { setName(e.target.value); markDirty(); }}
              className="text-xs"
              placeholder="e.g. Dive Center"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Active</Label>
              <p className="text-[11px] text-muted-foreground">Inactive departments are hidden from staff</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => { setIsActive(v); markDirty(); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* B) Scheduling Scope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduling Scope</CardTitle>
          <CardDescription className="text-xs">Controls which sessions appear in Planner, Master Sheet, and Inbox</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Scope Type</Label>
            <Input value="Activities" disabled className="text-xs bg-muted/50" />
            <p className="text-[11px] text-muted-foreground">Future scope types (service requests, transport) coming soon</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope-key" className="text-xs font-medium">Activity Category</Label>
            <Select
              value={activityScopeKey}
              onValueChange={(v) => { setActivityScopeKey(v); markDirty(); }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Sessions matching this category will be filtered into this department's views
            </p>
          </div>
        </CardContent>
      </Card>

      {/* C) Danger Zone */}
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

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm p-3 flex items-center justify-end gap-3 md:left-64">
          <p className="text-xs text-muted-foreground mr-auto">Unsaved changes</p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              if (currentDepartment) {
                setName(currentDepartment.name);
                setActivityScopeKey(currentDepartment.activity_scope_key ?? '');
                setIsActive(currentDepartment.is_active);
                setDirty(false);
              }
            }}
          >
            Discard
          </Button>
          <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
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
