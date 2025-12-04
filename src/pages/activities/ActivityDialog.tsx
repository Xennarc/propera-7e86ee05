import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ActivityCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const activitySchema = z.object({
  name: z.string().transform(val => val.trim()).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  category: z.string().min(1, 'Category is required'),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  default_price_per_person: z.number().min(0, 'Price cannot be negative'),
  default_max_capacity: z.number().min(1, 'Capacity must be at least 1'),
});

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  resortId: string;
  onSuccess: () => void;
}

const categories: ActivityCategory[] = ['DIVE', 'EXCURSION', 'WATERSPORT', 'SPA', 'OTHER'];

export function ActivityDialog({ open, onOpenChange, activity, resortId, onSuccess }: ActivityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'OTHER' as ActivityCategory,
    description: '',
    default_price_per_person: 0,
    duration_minutes: 60,
    default_max_capacity: 10,
    min_capacity: '',
    age_min: '',
    guest_can_book: true,
    requires_approval: false,
    guest_cutoff_hours: 2,
    max_pax_per_booking: 4,
    guest_can_cancel: true,
    guest_cancel_cutoff_hours: 4,
    is_active: true,
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name,
        category: activity.category,
        description: activity.description || '',
        default_price_per_person: activity.default_price_per_person,
        duration_minutes: activity.duration_minutes,
        default_max_capacity: activity.default_max_capacity,
        min_capacity: activity.min_capacity?.toString() || '',
        age_min: activity.age_min?.toString() || '',
        guest_can_book: activity.guest_can_book,
        requires_approval: activity.requires_approval,
        guest_cutoff_hours: activity.guest_cutoff_hours,
        max_pax_per_booking: activity.max_pax_per_booking,
        guest_can_cancel: activity.guest_can_cancel,
        guest_cancel_cutoff_hours: activity.guest_cancel_cutoff_hours,
        is_active: activity.is_active,
      });
    } else {
      setFormData({
        name: '',
        category: 'OTHER',
        description: '',
        default_price_per_person: 0,
        duration_minutes: 60,
        default_max_capacity: 10,
        min_capacity: '',
        age_min: '',
        guest_can_book: true,
        requires_approval: false,
        guest_cutoff_hours: 2,
        max_pax_per_booking: 4,
        guest_can_cancel: true,
        guest_cancel_cutoff_hours: 4,
        is_active: true,
      });
    }
    setErrors({});
    // Auto-focus name field when dialog opens
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [activity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = activitySchema.safeParse({
      name: formData.name,
      category: formData.category,
      duration_minutes: formData.duration_minutes,
      default_price_per_person: formData.default_price_per_person,
      default_max_capacity: formData.default_max_capacity,
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

    const activityData = {
      resort_id: resortId,
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description.trim() || null,
      default_price_per_person: formData.default_price_per_person,
      duration_minutes: formData.duration_minutes,
      default_max_capacity: formData.default_max_capacity,
      min_capacity: formData.min_capacity ? parseInt(formData.min_capacity) : null,
      age_min: formData.age_min ? parseInt(formData.age_min) : null,
      guest_can_book: formData.guest_can_book,
      requires_approval: formData.requires_approval,
      guest_cutoff_hours: formData.guest_cutoff_hours,
      max_pax_per_booking: formData.max_pax_per_booking,
      guest_can_cancel: formData.guest_can_cancel,
      guest_cancel_cutoff_hours: formData.guest_cancel_cutoff_hours,
      is_active: formData.is_active,
    };

    let error;
    if (activity) {
      const { error: updateError } = await supabase
        .from('activities')
        .update(activityData)
        .eq('id', activity.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('activities')
        .insert(activityData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: activity ? 'Activity updated' : 'Activity added' });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          <DialogDescription>
            {activity ? 'Update activity details' : 'Create a new activity or excursion'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                ref={nameInputRef}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  // Clear error when user types valid value
                  if (e.target.value.trim().length >= 2 && errors.name) {
                    setErrors(prev => ({ ...prev, name: '' }));
                  }
                }}
                placeholder="Sunset Diving"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as ActivityCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the activity..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price per Person ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.default_price_per_person}
                onChange={(e) => setFormData({ ...formData, default_price_per_person: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Max Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.default_max_capacity}
                onChange={(e) => setFormData({ ...formData, default_max_capacity: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_capacity">Min Capacity</Label>
              <Input
                id="min_capacity"
                type="number"
                min="1"
                value={formData.min_capacity}
                onChange={(e) => setFormData({ ...formData, min_capacity: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_min">Min Age</Label>
              <Input
                id="age_min"
                type="number"
                min="0"
                value={formData.age_min}
                onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Guest Booking Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="guest_can_book">Guests Can Book</Label>
                <Switch
                  id="guest_can_book"
                  checked={formData.guest_can_book}
                  onCheckedChange={(checked) => setFormData({ ...formData, guest_can_book: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requires_approval">Requires Approval</Label>
                <Switch
                  id="requires_approval"
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="guest_can_cancel">Guests Can Cancel</Label>
                <Switch
                  id="guest_can_cancel"
                  checked={formData.guest_can_cancel}
                  onCheckedChange={(checked) => setFormData({ ...formData, guest_can_cancel: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : activity ? 'Update Activity' : 'Add Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
