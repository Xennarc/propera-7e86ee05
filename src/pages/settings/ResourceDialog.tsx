import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resource, ResourceType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const resourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Type is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
});

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  resortId: string;
  onSuccess: () => void;
}

const resourceTypes: ResourceType[] = ['BOAT', 'VAN', 'CABANA', 'OTHER'];

export function ResourceDialog({ open, onOpenChange, resource, resortId, onSuccess }: ResourceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    type: 'OTHER' as ResourceType,
    capacity: 10,
    is_active: true,
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (resource) {
      setFormData({
        name: resource.name,
        type: resource.type,
        capacity: resource.capacity,
        is_active: resource.is_active,
      });
    } else {
      setFormData({
        name: '',
        type: 'OTHER',
        capacity: 10,
        is_active: true,
      });
    }
    setErrors({});
  }, [resource, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = resourceSchema.safeParse({
      name: formData.name,
      type: formData.type,
      capacity: formData.capacity,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const resourceData = {
      resort_id: resortId,
      name: formData.name.trim(),
      type: formData.type,
      capacity: formData.capacity,
      is_active: formData.is_active,
    };

    let error;
    if (resource) {
      const { error: updateError } = await supabase
        .from('resources')
        .update(resourceData)
        .eq('id', resource.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('resources')
        .insert(resourceData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: resource ? 'Resource updated' : 'Resource added' });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          <DialogDescription>
            {resource ? 'Update resource details' : 'Add a new boat, van, or other resource'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dive Boat Alpha"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as ResourceType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 10 })}
            />
            {errors.capacity && <p className="text-sm text-destructive">{errors.capacity}</p>}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : resource ? 'Update Resource' : 'Add Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
