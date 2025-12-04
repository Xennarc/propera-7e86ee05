import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantTimeSlot, MealPeriod, SlotStatus } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RestaurantSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: RestaurantTimeSlot | null;
  resortId: string;
  restaurants: Restaurant[];
  onSuccess: () => void;
}

export function RestaurantSlotDialog({
  open,
  onOpenChange,
  slot,
  resortId,
  restaurants,
  onSuccess,
}: RestaurantSlotDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    restaurant_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '19:00',
    end_time: '21:00',
    meal_period: 'DINNER' as MealPeriod,
    capacity: 50,
    status: 'OPEN' as SlotStatus,
  });

  const { toast } = useToast();

  useEffect(() => {
    if (slot) {
      setFormData({
        restaurant_id: slot.restaurant_id,
        date: slot.date,
        start_time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
        meal_period: slot.meal_period,
        capacity: slot.capacity,
        status: slot.status,
      });
    } else {
      const defaultRestaurant = restaurants[0];
      setFormData({
        restaurant_id: defaultRestaurant?.id || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '19:00',
        end_time: '21:00',
        meal_period: 'DINNER',
        capacity: defaultRestaurant?.total_capacity || 50,
        status: 'OPEN',
      });
    }
  }, [slot, open, restaurants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time range
    if (formData.end_time <= formData.start_time) {
      toast({ variant: 'destructive', title: 'Invalid time range', description: 'End time must be after start time' });
      return;
    }
    
    setLoading(true);

    const payload = {
      resort_id: resortId,
      restaurant_id: formData.restaurant_id,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      meal_period: formData.meal_period,
      capacity: formData.capacity,
      status: formData.status,
    };

    let error;
    if (slot) {
      ({ error } = await supabase
        .from('restaurant_time_slots')
        .update(payload)
        .eq('id', slot.id));
    } else {
      ({ error } = await supabase
        .from('restaurant_time_slots')
        .insert(payload));
    }

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: slot ? 'Slot updated' : 'Slot created' });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{slot ? 'Edit Time Slot' : 'New Time Slot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Restaurant *</Label>
            <Select
              value={formData.restaurant_id}
              onValueChange={(v) => setFormData({ ...formData, restaurant_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meal Period *</Label>
            <Select
              value={formData.meal_period}
              onValueChange={(v) => setFormData({ ...formData, meal_period: v as MealPeriod })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                <SelectItem value="LUNCH">Lunch</SelectItem>
                <SelectItem value="DINNER">Dinner</SelectItem>
                <SelectItem value="EVENT">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Capacity *</Label>
            <Input
              type="number"
              min={1}
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          {slot && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as SlotStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : slot ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
