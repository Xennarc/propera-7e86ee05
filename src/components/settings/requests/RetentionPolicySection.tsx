import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, Info, Archive, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useRetentionPolicy,
  useRetentionPolicyMutation,
  useDepartmentRetentionOverrides,
  useDepartmentRetentionOverrideMutations,
  useDepartments,
} from '@/hooks/useRequestsSettings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  resortId: string;
}

export function RetentionPolicySection({ resortId }: Props) {
  const { toast } = useToast();
  const { data: policy, isLoading: policyLoading } = useRetentionPolicy(resortId);
  const { data: overrides = [], isLoading: overridesLoading } = useDepartmentRetentionOverrides(resortId);
  const { data: departments = [] } = useDepartments(resortId);
  const policyMutation = useRetentionPolicyMutation(resortId);
  const { upsert, remove } = useDepartmentRetentionOverrideMutations(resortId);

  const [archiveDays, setArchiveDays] = useState(30);
  const [deleteDays, setDeleteDays] = useState(365);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({ department_key: '', archive_days: '', delete_days: '' });

  useEffect(() => {
    if (policy) {
      setArchiveDays(policy.default_archive_after_days);
      setDeleteDays(policy.default_delete_after_days);
    }
  }, [policy]);

  const handleSaveDefaults = async () => {
    try {
      await policyMutation.mutateAsync({
        default_archive_after_days: archiveDays,
        default_delete_after_days: deleteDays,
      });
      toast({ title: 'Retention policy saved' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error saving policy', description: (err as Error).message });
    }
  };

  const handleAddOverride = async () => {
    if (!newOverride.department_key) return;
    try {
      await upsert.mutateAsync({
        resort_id: resortId,
        department_key: newOverride.department_key,
        archive_after_days: newOverride.archive_days ? parseInt(newOverride.archive_days) : null,
        delete_after_days: newOverride.delete_days ? parseInt(newOverride.delete_days) : null,
      });
      setOverrideDialogOpen(false);
      setNewOverride({ department_key: '', archive_days: '', delete_days: '' });
      toast({ title: 'Override added' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error adding override', description: (err as Error).message });
    }
  };

  const handleRemoveOverride = async (deptKey: string) => {
    try {
      await remove.mutateAsync(deptKey);
      toast({ title: 'Override removed' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error removing override', description: (err as Error).message });
    }
  };

  const usedDepartmentKeys = overrides.map((o) => o.department_key);
  const availableDepartments = departments.filter((d) => !usedDepartmentKeys.includes(d.key));

  if (policyLoading || overridesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How archiving works:</strong> Completed or cancelled requests are moved to an archive
          after the specified number of days. Archived requests are permanently deleted after the deletion
          period. This helps keep your active queue clean while maintaining records for compliance.
        </AlertDescription>
      </Alert>

      {/* Default Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Default Retention Policy
          </CardTitle>
          <CardDescription>
            Set the default archiving and deletion periods for all departments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Archive After (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={archiveDays}
                onChange={(e) => setArchiveDays(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                Completed/cancelled requests move to archive after this many days
              </p>
            </div>
            <div className="space-y-2">
              <Label>Delete After (days)</Label>
              <Input
                type="number"
                min={30}
                max={3650}
                value={deleteDays}
                onChange={(e) => setDeleteDays(parseInt(e.target.value) || 365)}
              />
              <p className="text-xs text-muted-foreground">
                Archived requests are permanently deleted after this many days
              </p>
            </div>
          </div>

          <Button onClick={handleSaveDefaults} disabled={policyMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {policyMutation.isPending ? 'Saving...' : 'Save Defaults'}
          </Button>
        </CardContent>
      </Card>

      {/* Department Overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Department Overrides
              </CardTitle>
              <CardDescription>
                Override retention periods for specific departments
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideDialogOpen(true)}
              disabled={availableDepartments.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Override
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No department overrides configured. All departments use the default policy.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Archive After</TableHead>
                  <TableHead>Delete After</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((override) => {
                  const dept = departments.find((d) => d.key === override.department_key);
                  return (
                    <TableRow key={override.id}>
                      <TableCell>
                        <Badge variant="outline">{dept?.name || override.department_key}</Badge>
                      </TableCell>
                      <TableCell>
                        {override.archive_after_days !== null
                          ? `${override.archive_after_days} days`
                          : <span className="text-muted-foreground">Default ({archiveDays})</span>}
                      </TableCell>
                      <TableCell>
                        {override.delete_after_days !== null
                          ? `${override.delete_after_days} days`
                          : <span className="text-muted-foreground">Default ({deleteDays})</span>}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOverride(override.department_key)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department Override</DialogTitle>
            <DialogDescription>
              Set custom retention periods for a specific department. Leave blank to use defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={newOverride.department_key}
                onValueChange={(v) => setNewOverride({ ...newOverride, department_key: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept.key} value={dept.key}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Archive After (days)</Label>
                <Input
                  type="number"
                  placeholder={`Default: ${archiveDays}`}
                  value={newOverride.archive_days}
                  onChange={(e) => setNewOverride({ ...newOverride, archive_days: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Delete After (days)</Label>
                <Input
                  type="number"
                  placeholder={`Default: ${deleteDays}`}
                  value={newOverride.delete_days}
                  onChange={(e) => setNewOverride({ ...newOverride, delete_days: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOverride} disabled={!newOverride.department_key || upsert.isPending}>
              {upsert.isPending ? 'Adding...' : 'Add Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
