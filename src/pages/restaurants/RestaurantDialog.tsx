import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/database';
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
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const restaurantSchema = z.object({
  name: z.string().transform(val => val.trim()).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  total_capacity: z.number().min(1, 'Capacity must be at least 1'),
});

interface RestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
  resortId: string;
  onSuccess: () => void;
}

export function RestaurantDialog({ open, onOpenChange, restaurant, resortId, onSuccess }: RestaurantDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_capacity: 50,
    guest_can_book: true,
    requires_approval: false,
    guest_cutoff_minutes: 30,
    max_pax_per_booking: 6,
    guest_can_cancel: true,
    guest_cancel_cutoff_minutes: 60,
    is_active: true,
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        description: restaurant.description || '',
        total_capacity: restaurant.total_capacity,
        guest_can_book: restaurant.guest_can_book,
        requires_approval: restaurant.requires_approval,
        guest_cutoff_minutes: restaurant.guest_cutoff_minutes,
        max_pax_per_booking: restaurant.max_pax_per_booking,
        guest_can_cancel: restaurant.guest_can_cancel,
        guest_cancel_cutoff_minutes: restaurant.guest_cancel_cutoff_minutes,
        is_active: restaurant.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        total_capacity: 50,
        guest_can_book: true,
        requires_approval: false,
        guest_cutoff_minutes: 30,
        max_pax_per_booking: 6,
        guest_can_cancel: true,
        guest_cancel_cutoff_minutes: 60,
        is_active: true,
      });
    }
    setErrors({});
  }, [restaurant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = restaurantSchema.safeParse({
      name: formData.name,
      total_capacity: formData.total_capacity,
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

    const restaurantData = {
      resort_id: resortId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      total_capacity: formData.total_capacity,
      guest_can_book: formData.guest_can_book,
      requires_approval: formData.requires_approval,
      guest_cutoff_minutes: formData.guest_cutoff_minutes,
      max_pax_per_booking: formData.max_pax_per_booking,
      guest_can_cancel: formData.guest_can_cancel,
      guest_cancel_cutoff_minutes: formData.guest_cancel_cutoff_minutes,
      is_active: formData.is_active,
    };

    let error;
    if (restaurant) {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update(restaurantData)
        .eq('id', restaurant.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('restaurants')
        .insert(restaurantData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: restaurant ? 'Restaurant updated' : 'Restaurant added' });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{restaurant ? 'Edit Restaurant' : 'Add Restaurant'}</DialogTitle>
          <DialogDescription>
            {restaurant ? 'Update restaurant details' : 'Create a new dining venue'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                // Clear error when user types valid value
                if (e.target.value.trim().length >= 2 && errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }));
                }
              }}
              placeholder="Oceanview Restaurant"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the restaurant..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Total Capacity (seats)</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.total_capacity}
                onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) || 50 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_pax">Max Pax per Booking</Label>
              <Input
                id="max_pax"
                type="number"
                min="1"
                value={formData.max_pax_per_booking}
                onChange={(e) => setFormData({ ...formData, max_pax_per_booking: parseInt(e.target.value) || 6 })}
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
              {loading ? 'Saving...' : restaurant ? 'Update Restaurant' : 'Add Restaurant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
