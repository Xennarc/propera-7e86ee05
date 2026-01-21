import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDepartments, useDepartmentMutations } from '@/hooks/useRequestsSettings';
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

export function DepartmentsManagerSection({ resortId }: Props) {
  const { toast } = useToast();
  const { data: departments = [], isLoading } = useDepartments(resortId);
  const { create, update, toggleActive } = useDepartmentMutations(resortId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [formData, setFormData] = useState({ key: '', name: '' });

  const openCreateDialog = () => {
    setEditMode(null);
    setFormData({ key: '', name: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (dept: { id: string; key: string; name: string }) => {
    setEditMode(dept.id);
    setFormData({ key: dept.key, name: dept.name });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Name is required' });
      return;
    }

    try {
      if (editMode) {
        await update.mutateAsync({ id: editMode, updates: { name: formData.name } });
        toast({ title: 'Department updated' });
      } else {
        if (!formData.key.trim()) {
          toast({ variant: 'destructive', title: 'Key is required' });
          return;
        }
        await create.mutateAsync({ key: formData.key, name: formData.name });
        toast({ title: 'Department created' });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const handleToggle = async (id: string, currentlyActive: boolean) => {
    try {
      await toggleActive.mutateAsync({ id, is_active: !currentlyActive });
      toast({ title: currentlyActive ? 'Department disabled' : 'Department enabled' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  const activeDepartments = departments.filter((d) => d.is_active);
  const inactiveDepartments = departments.filter((d) => !d.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Departments
              </CardTitle>
              <CardDescription>
                Manage operational departments that handle guest requests
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No departments configured. Add your first department to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{dept.key}</code>
                    </TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={dept.is_active}
                          onCheckedChange={() => handleToggle(dept.id, dept.is_active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inactiveDepartments.map((dept) => (
                  <TableRow key={dept.id} className="opacity-60">
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{dept.key}</code>
                    </TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={dept.is_active}
                          onCheckedChange={() => handleToggle(dept.id, dept.is_active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Update the department name. The key cannot be changed.'
                : 'Create a new department for handling guest requests.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Key</Label>
              <Input
                placeholder="e.g., HOUSEKEEPING"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                disabled={!!editMode}
              />
              {!editMode && (
                <p className="text-xs text-muted-foreground">
                  A unique identifier. Use UPPERCASE with underscores. Cannot be changed later.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                placeholder="e.g., Housekeeping"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? 'Saving...' : editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
