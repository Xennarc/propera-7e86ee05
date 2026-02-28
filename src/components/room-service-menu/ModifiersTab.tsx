/**
 * Modifiers CRUD tab — groups + options + item attachment.
 */

import { useState } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ChevronDown, Link2 } from 'lucide-react';

interface ModGroup {
  id: string;
  name: string;
  selection_type: string;
  min_selected: number;
  max_selected: number | null;
  is_active: boolean;
  sort_order: number;
}

interface ModOption {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
}

interface MenuItem {
  id: string;
  name: string;
}

interface ItemLink {
  id: string;
  item_id: string;
  group_id: string;
  sort_order: number;
}

export function RoomServiceModifiersTab() {
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ──
  const [groupDialog, setGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModGroup | null>(null);
  const [gForm, setGForm] = useState({ name: '', selection_type: 'single', min_selected: '0', max_selected: '' });

  const [optionDialog, setOptionDialog] = useState(false);
  const [editingOption, setEditingOption] = useState<ModOption | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [oForm, setOForm] = useState({ name: '', price_delta: '0' });

  const [linkDialog, setLinkDialog] = useState(false);
  const [linkGroupId, setLinkGroupId] = useState<string | null>(null);
  const [linkItemId, setLinkItemId] = useState('');

  // ── Queries ──
  const groupsKey = ['rs-modifier-groups', resortId];
  const optionsKey = ['rs-modifier-options', resortId];
  const linksKey = ['rs-item-modifier-links', resortId];
  const itemsKey = ['rs-menu-items-staff', resortId];

  const { data: groups = [], isLoading } = useQuery({
    queryKey: groupsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_modifier_groups')
        .select('id, name, selection_type, min_selected, max_selected, is_active, sort_order')
        .eq('resort_id', resortId!)
        .order('sort_order');
      if (error) throw error;
      return data as ModGroup[];
    },
    enabled: !!resortId,
  });

  const { data: options = [] } = useQuery({
    queryKey: optionsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_modifier_options')
        .select('id, group_id, name, price_delta, is_available, sort_order')
        .eq('resort_id', resortId!)
        .order('sort_order');
      if (error) throw error;
      return data as ModOption[];
    },
    enabled: !!resortId,
  });

  const { data: links = [] } = useQuery({
    queryKey: linksKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_item_modifier_groups')
        .select('id, item_id, group_id, sort_order')
        .eq('resort_id', resortId!);
      if (error) throw error;
      return data as ItemLink[];
    },
    enabled: !!resortId,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: itemsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_menu_items')
        .select('id, name')
        .eq('resort_id', resortId!)
        .order('name');
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!resortId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: groupsKey });
    queryClient.invalidateQueries({ queryKey: optionsKey });
    queryClient.invalidateQueries({ queryKey: linksKey });
  };

  // ── Group mutations ──
  const groupMutation = useMutation({
    mutationFn: async (p: any) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from('room_service_modifier_groups').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('room_service_modifier_groups').insert({ ...p, resort_id: resortId! });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setGroupDialog(false); toast({ title: 'Saved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('room_service_modifier_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Group deleted' }); },
    onError: (e: any) => toast({ title: 'Cannot delete', description: e.message, variant: 'destructive' }),
  });

  // ── Option mutations ──
  const optionMutation = useMutation({
    mutationFn: async (p: any) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from('room_service_modifier_options').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('room_service_modifier_options').insert({ ...p, resort_id: resortId! });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setOptionDialog(false); toast({ title: 'Saved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('room_service_modifier_options').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Option deleted' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── Link mutations ──
  const addLinkMutation = useMutation({
    mutationFn: async ({ item_id, group_id }: { item_id: string; group_id: string }) => {
      const maxSort = links.filter(l => l.item_id === item_id).length;
      const { error } = await supabase
        .from('room_service_item_modifier_groups')
        .insert({ item_id, group_id, resort_id: resortId!, sort_order: maxSort + 1 });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setLinkDialog(false); toast({ title: 'Group attached' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const removeLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('room_service_item_modifier_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Detached' }); },
  });

  // ── Handlers ──
  const openCreateGroup = () => {
    setEditingGroup(null);
    setGForm({ name: '', selection_type: 'single', min_selected: '0', max_selected: '' });
    setGroupDialog(true);
  };

  const openEditGroup = (g: ModGroup) => {
    setEditingGroup(g);
    setGForm({
      name: g.name,
      selection_type: g.selection_type,
      min_selected: String(g.min_selected),
      max_selected: g.max_selected != null ? String(g.max_selected) : '',
    });
    setGroupDialog(true);
  };

  const saveGroup = () => {
    groupMutation.mutate({
      ...(editingGroup ? { id: editingGroup.id } : {}),
      name: gForm.name.trim(),
      selection_type: gForm.selection_type,
      min_selected: parseInt(gForm.min_selected) || 0,
      max_selected: gForm.max_selected ? parseInt(gForm.max_selected) : null,
      sort_order: editingGroup?.sort_order ?? (groups.length + 1),
    });
  };

  const openCreateOption = (groupId: string) => {
    setActiveGroupId(groupId);
    setEditingOption(null);
    setOForm({ name: '', price_delta: '0' });
    setOptionDialog(true);
  };

  const openEditOption = (opt: ModOption) => {
    setActiveGroupId(opt.group_id);
    setEditingOption(opt);
    setOForm({ name: opt.name, price_delta: String(opt.price_delta) });
    setOptionDialog(true);
  };

  const saveOption = () => {
    const grpOpts = options.filter(o => o.group_id === activeGroupId);
    optionMutation.mutate({
      ...(editingOption ? { id: editingOption.id } : {}),
      group_id: activeGroupId!,
      name: oForm.name.trim(),
      price_delta: parseFloat(oForm.price_delta) || 0,
      sort_order: editingOption?.sort_order ?? (grpOpts.length + 1),
    });
  };

  const itemNameById = (id: string) => menuItems.find(i => i.id === id)?.name || id.slice(0, 8);

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{groups.length} modifier groups</p>
        <Button size="sm" onClick={openCreateGroup} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No modifier groups yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const grpOpts = options.filter(o => o.group_id === g.id);
            const grpLinks = links.filter(l => l.group_id === g.id);
            return (
              <Collapsible key={g.id}>
                <Card>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 text-left flex-1">
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        <span className="text-sm font-medium text-foreground">{g.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5">
                          {g.selection_type} · min {g.min_selected}{g.max_selected != null ? ` / max ${g.max_selected}` : ''}
                        </Badge>
                        <Badge variant={g.is_active ? 'default' : 'outline'} className="text-[9px] px-1.5">
                          {g.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGroup(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGroupMutation.mutate(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {/* Options */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Options</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => openCreateOption(g.id)}>
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                        </div>
                        {grpOpts.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 pl-2">No options</p>
                        ) : (
                          grpOpts.map(opt => (
                            <div key={opt.id} className="flex items-center gap-2 pl-2 text-xs">
                              <span className="flex-1 text-foreground">{opt.name}</span>
                              {Number(opt.price_delta) !== 0 && (
                                <span className="text-muted-foreground">
                                  {Number(opt.price_delta) > 0 ? '+' : ''}{Number(opt.price_delta).toFixed(2)}
                                </span>
                              )}
                              <Switch
                                className="scale-75"
                                checked={opt.is_available}
                                onCheckedChange={val => {
                                  supabase
                                    .from('room_service_modifier_options')
                                    .update({ is_available: val })
                                    .eq('id', opt.id)
                                    .then(() => queryClient.invalidateQueries({ queryKey: optionsKey }));
                                }}
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditOption(opt)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteOptionMutation.mutate(opt.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      <Separator />

                      {/* Linked items */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Attached to items</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={() => { setLinkGroupId(g.id); setLinkItemId(''); setLinkDialog(true); }}
                          >
                            <Link2 className="h-3 w-3" /> Attach
                          </Button>
                        </div>
                        {grpLinks.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 pl-2">Not attached to any items</p>
                        ) : (
                          grpLinks.map(lnk => (
                            <div key={lnk.id} className="flex items-center gap-2 pl-2 text-xs">
                              <span className="flex-1 text-foreground">{itemNameById(lnk.item_id)}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeLinkMutation.mutate(lnk.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Group dialog */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'New Modifier Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={gForm.name} onChange={e => setGForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Selection type</Label>
              <Select value={gForm.selection_type} onValueChange={v => setGForm(f => ({ ...f, selection_type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="multiple">Multiple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min selected</Label>
                <Input type="number" value={gForm.min_selected} onChange={e => setGForm(f => ({ ...f, min_selected: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Max selected (blank = unlimited)</Label>
                <Input type="number" value={gForm.max_selected} onChange={e => setGForm(f => ({ ...f, max_selected: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button onClick={saveGroup} disabled={!gForm.name.trim()}>{editingGroup ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option dialog */}
      <Dialog open={optionDialog} onOpenChange={setOptionDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingOption ? 'Edit Option' : 'New Option'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={oForm.name} onChange={e => setOForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Price delta</Label>
              <Input type="number" step="0.01" value={oForm.price_delta} onChange={e => setOForm(f => ({ ...f, price_delta: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionDialog(false)}>Cancel</Button>
            <Button onClick={saveOption} disabled={!oForm.name.trim()}>{editingOption ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach group to item dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Attach to Menu Item</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">Menu item</Label>
            <Select value={linkItemId} onValueChange={setLinkItemId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {menuItems.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addLinkMutation.mutate({ item_id: linkItemId, group_id: linkGroupId! })}
              disabled={!linkItemId || addLinkMutation.isPending}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
