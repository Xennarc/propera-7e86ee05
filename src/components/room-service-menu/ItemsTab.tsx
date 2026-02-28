/**
 * Items CRUD tab for room service menu management.
 */

import { useState, useMemo } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  category_id: string;
  image_url: string | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  tags: string[] | null;
  prep_time_minutes: number | null;
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  dietary_tags: '',
  allergens: '',
  tags: '',
  prep_time_minutes: '',
};

export function RoomServiceItemsTab() {
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState<string>('all');

  const itemsKey = ['rs-menu-items-staff', resortId];

  const { data: categories = [] } = useQuery({
    queryKey: ['rs-menu-categories', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_menu_categories')
        .select('id, name')
        .eq('resort_id', resortId!)
        .order('sort_order');
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!resortId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: itemsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_menu_items')
        .select('*')
        .eq('resort_id', resortId!)
        .order('sort_order');
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!resortId,
  });

  const filteredItems = useMemo(
    () => filterCat === 'all' ? items : items.filter(i => i.category_id === filterCat),
    [items, filterCat],
  );

  const upsertMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from('room_service_menu_items').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('room_service_menu_items').insert({ ...payload, resort_id: resortId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemsKey });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? 'Item updated' : 'Item created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleField = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from('room_service_menu_items').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('room_service_menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemsKey });
      toast({ title: 'Item deleted' });
    },
    onError: (e: any) => toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' }),
  });

  const parseArr = (s: string) => s.trim() ? s.split(',').map(t => t.trim()).filter(Boolean) : null;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id,
      image_url: item.image_url || '',
      dietary_tags: (item.dietary_tags || []).join(', '),
      allergens: (item.allergens || []).join(', '),
      tags: (item.tags || []).join(', '),
      prep_time_minutes: item.prep_time_minutes != null ? String(item.prep_time_minutes) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.category_id || !form.price) return;
    upsertMutation.mutate({
      ...(editing ? { id: editing.id } : {}),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      category_id: form.category_id,
      image_url: form.image_url.trim() || null,
      dietary_tags: parseArr(form.dietary_tags),
      allergens: parseArr(form.allergens),
      tags: parseArr(form.tags),
      prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
      sort_order: editing?.sort_order ?? (items.length + 1),
    });
  };

  const catName = (id: string) => categories.find(c => c.id === id)?.name || '—';

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filteredItems.length} items</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No items yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{catName(item.category_id)}</span>
                      {item.is_featured && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                      {!item.is_available && (
                        <Badge variant="outline" className="text-[9px] px-1.5">Unavailable</Badge>
                      )}
                      {!item.is_active && (
                        <Badge variant="outline" className="text-[9px] px-1.5 text-destructive">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {item.currency} {Number(item.price).toFixed(2)}
                      </span>
                      {item.prep_time_minutes && <span>· {item.prep_time_minutes} min</span>}
                      {item.allergens?.length ? (
                        <span className="text-destructive">· Allergens: {item.allergens.join(', ')}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={item.is_featured ? 'Unfeature' : 'Feature'}
                      onClick={() => toggleField.mutate({ id: item.id, field: 'is_featured', value: !item.is_featured })}
                    >
                      <Star className={`h-3.5 w-3.5 ${item.is_featured ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                      onClick={() => toggleField.mutate({ id: item.id, field: 'is_available', value: !item.is_available })}
                    >
                      {item.is_available ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Category *</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Prep time (minutes)</Label>
              <Input type="number" value={form.prep_time_minutes} onChange={e => setForm(f => ({ ...f, prep_time_minutes: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Allergens (comma-separated)</Label>
              <Input value={form.allergens} onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))} placeholder="Gluten, Dairy, Nuts" />
            </div>
            <div>
              <Label className="text-xs">Dietary tags (comma-separated)</Label>
              <Input value={form.dietary_tags} onChange={e => setForm(f => ({ ...f, dietary_tags: e.target.value }))} placeholder="Vegan, Halal" />
            </div>
            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Popular, Chef's pick" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending || !form.name.trim() || !form.category_id || !form.price}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
