import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Phone, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface DirectoryEntry {
  id: string;
  name: string;
  phone_number: string;
  description: string | null;
  category: string;
  display_order: number;
  is_active: boolean;
}

export default function ResortDirectoryPage() {
  const { currentResort } = useResort();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    description: '',
    category: 'general',
    is_active: true,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['resort-directory-admin', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];
      
      const { data, error } = await supabase
        .from('resort_directory')
        .select('*')
        .eq('resort_id', currentResort.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as DirectoryEntry[];
    },
    enabled: !!currentResort?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('resort_directory')
        .insert({
          resort_id: currentResort!.id,
          name: data.name.trim(),
          phone_number: data.phone_number.trim(),
          description: data.description.trim() || null,
          category: data.category,
          is_active: data.is_active,
          display_order: (entries?.length || 0) + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resort-directory-admin'] });
      toast.success('Directory entry added');
      closeDialog();
    },
    onError: () => toast.error('Failed to add entry'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('resort_directory')
        .update({
          name: data.name.trim(),
          phone_number: data.phone_number.trim(),
          description: data.description.trim() || null,
          category: data.category,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resort-directory-admin'] });
      toast.success('Directory entry updated');
      closeDialog();
    },
    onError: () => toast.error('Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resort_directory')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resort-directory-admin'] });
      toast.success('Directory entry deleted');
    },
    onError: () => toast.error('Failed to delete entry'),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEntry(null);
    setFormData({ name: '', phone_number: '', description: '', category: 'general', is_active: true });
  };

  const openCreateDialog = () => {
    setEditingEntry(null);
    setFormData({ name: '', phone_number: '', description: '', category: 'general', is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: DirectoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      name: entry.name,
      phone_number: entry.phone_number,
      description: entry.description || '',
      category: entry.category,
      is_active: entry.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone_number.trim()) {
      toast.error('Name and phone number are required');
      return;
    }
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resort Directory"
        description="Manage phone numbers and contacts visible to guests"
        action={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Directory Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No directory entries yet</p>
              <p className="text-sm text-muted-foreground">Add phone numbers for guests to contact outlets</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell>{entry.phone_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                        {entry.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this directory entry?')) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Directory Entry' : 'Add Directory Entry'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Front Desk, Restaurant, Spa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="e.g., +960 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Open 24 hours"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Visible to guests</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEntry ? 'Save Changes' : 'Add Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
