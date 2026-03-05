/**
 * DeptResourcesAssetsPage – View and manage department assets.
 * Manager-gated editing. Staff see read-only list.
 */
import { useState } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Plus, Loader2, Anchor, Truck } from 'lucide-react';

function Content() {
  const { currentDepartment, isManager } = useDepartment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resortId = currentDepartment?.resort_id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('BOAT');
  const [formCapacity, setFormCapacity] = useState('');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['dept-assets', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      const { data } = await supabase
        .from('ops_assets')
        .select('*')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('type')
        .order('name');
      return data ?? [];
    },
    enabled: !!resortId,
    staleTime: 30_000,
  });

  const handleCreate = async () => {
    if (!formName || !resortId) return;
    setSaving(true);
    const { error } = await supabase.from('ops_assets').insert({
      resort_id: resortId,
      name: formName,
      type: formType,
      capacity_int: formCapacity ? parseInt(formCapacity) : null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Asset created' });
      setDialogOpen(false);
      setFormName('');
      queryClient.invalidateQueries({ queryKey: ['dept-assets'] });
    }
    setSaving(false);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'BOAT': return <Anchor className="h-4 w-4 text-primary" />;
      case 'VAN': return <Truck className="h-4 w-4 text-primary" />;
      default: return <Wrench className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Assets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentDepartment?.name}</p>
        </div>
        {isManager && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Asset
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : assets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Wrench className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No assets configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assets.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {typeIcon(a.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] capitalize">{a.type.toLowerCase()}</Badge>
                    {a.capacity_int && <span>{a.capacity_int} pax</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Dhoni Sunrise" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOAT">Boat</SelectItem>
                  <SelectItem value="VAN">Van</SelectItem>
                  <SelectItem value="CABANA">Cabana</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity (optional)</Label>
              <Input type="number" value={formCapacity} onChange={e => setFormCapacity(e.target.value)} placeholder="e.g. 12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!formName || saving} onClick={handleCreate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DeptResourcesAssetsPage() {
  return (
    <DepartmentGuard moduleKey="resources_assets">
      <Content />
    </DepartmentGuard>
  );
}
