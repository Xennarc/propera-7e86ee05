import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, List, Globe, Building2, Search, Lock } from 'lucide-react';
import { RequestIconPicker } from '@/components/ui/request-icon-picker';
import { getRequestIcon } from '@/lib/request-icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useRequestCatalogItems,
  useRequestCatalogMutations,
  useDepartments,
  CatalogItem,
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

const CATEGORIES = ['HOUSEKEEPING', 'MINIBAR', 'MAINTENANCE', 'CONCIERGE', 'FNB', 'OTHER'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function RequestCatalogSection({ resortId }: Props) {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useRequestCatalogItems(resortId);
  const { data: departments = [] } = useDepartments(resortId);
  const { create, toggleActive } = useRequestCatalogMutations(resortId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: 'HOUSEKEEPING',
    department_key: 'HOUSEKEEPING',
    default_priority: 'NORMAL',
    is_billable: false,
    icon_key: null as string | null,
  });

  // Split items into global (read-only) and resort-specific
  const globalItems = items.filter((i) => i.resort_id === null);
  const resortItems = items.filter((i) => i.resort_id !== null);

  const filterItems = (list: CatalogItem[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.department_key.toLowerCase().includes(q)
    );
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    try {
      await create.mutateAsync({
        code: `CUSTOM_${Date.now()}`,
        title: formData.title,
        category: formData.category,
        department_key: formData.department_key,
        icon_key: formData.icon_key,
        is_active: true,
        is_billable: formData.is_billable,
        default_priority: formData.default_priority,
      });
      setDialogOpen(false);
      setFormData({
        title: '',
        category: 'HOUSEKEEPING',
        department_key: 'HOUSEKEEPING',
        default_priority: 'NORMAL',
        is_billable: false,
        icon_key: null,
      });
      toast({ title: 'Catalog item created' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const handleToggle = async (id: string, currentlyActive: boolean, isGlobal: boolean) => {
    if (isGlobal) {
      toast({ variant: 'destructive', title: 'Cannot modify global items directly' });
      return;
    }
    try {
      await toggleActive.mutateAsync({ id, is_active: !currentlyActive });
      toast({ title: currentlyActive ? 'Item disabled' : 'Item enabled' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const renderItemsTable = (itemList: CatalogItem[], isGlobalList = false) => {
    const filtered = filterItems(itemList);
    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'No items match your search' : 'No items in this category'}
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Icon</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Billable</TableHead>
            <TableHead className="w-24">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => {
            const dept = departments.find((d) => d.key === item.department_key);
            const ItemIcon = getRequestIcon(item.icon_key);
            return (
              <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : undefined}>
                <TableCell>
                  <ItemIcon className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.title}
                    {isGlobalList && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{dept?.name || item.department_key}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.default_priority === 'URGENT'
                        ? 'destructive'
                        : item.default_priority === 'HIGH'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {item.default_priority}
                  </Badge>
                </TableCell>
                <TableCell>{item.is_billable ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => handleToggle(item.id, item.is_active, isGlobalList)}
                    disabled={isGlobalList}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Request Catalog
              </CardTitle>
              <CardDescription>
                Manage the items guests can request. Global templates are read-only.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resort" className="space-y-4">
            <TabsList>
              <TabsTrigger value="resort" className="gap-2">
                <Building2 className="h-4 w-4" />
                Resort Items ({resortItems.length})
              </TabsTrigger>
              <TabsTrigger value="global" className="gap-2">
                <Globe className="h-4 w-4" />
                Global Templates ({globalItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resort">{renderItemsTable(resortItems, false)}</TabsContent>

            <TabsContent value="global">
              <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <Lock className="h-4 w-4 inline-block mr-2" />
                Global templates are read-only. To customize, create a resort-specific item.
              </div>
              {renderItemsTable(globalItems, true)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Catalog Item</DialogTitle>
            <DialogDescription>
              Create a custom request item for your resort. This will be available in the guest portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Extra Towels"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.department_key}
                  onValueChange={(v) => setFormData({ ...formData, department_key: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.filter((d) => d.is_active).map((dept) => (
                      <SelectItem key={dept.key} value={dept.key}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Priority</Label>
                <Select
                  value={formData.default_priority}
                  onValueChange={(v) => setFormData({ ...formData, default_priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <RequestIconPicker
                  value={formData.icon_key}
                  onChange={(v) => setFormData({ ...formData, icon_key: v })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_billable}
                onCheckedChange={(v) => setFormData({ ...formData, is_billable: v })}
              />
              <Label>Billable item</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
