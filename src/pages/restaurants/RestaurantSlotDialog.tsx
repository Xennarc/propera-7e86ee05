import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantTimeSlot, MealPeriod, SlotStatus } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
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

  // Check booking count when editing a slot
  useEffect(() => {
    if (slot?.id) {
      checkBookingCount(slot.id);
    } else {
      setBookingCount(null);
    }
  }, [slot?.id]);

  const checkBookingCount = async (slotId: string) => {
    const { count } = await supabase
      .from('restaurant_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_slot_id', slotId);
    setBookingCount(count ?? 0);
  };

  const handleDelete = async () => {
    if (!slot) return;
    setDeleteLoading(true);

    if (bookingCount === 0) {
      // No bookings - hard delete
      const { error } = await supabase
        .from('restaurant_time_slots')
        .delete()
        .eq('id', slot.id);
      
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Deleted', description: 'Time slot has been removed' });
        onSuccess();
        onOpenChange(false);
      }
    } else {
      // Has bookings - soft close
      const { error } = await supabase
        .from('restaurant_time_slots')
        .update({ status: 'CLOSED' })
        .eq('id', slot.id);
      
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Closed', description: 'Time slot closed to new reservations' });
        onSuccess();
        onOpenChange(false);
      }
    }
    
    setDeleteLoading(false);
    setShowDeleteDialog(false);
  };

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
    // Auto-focus date field when dialog opens
    if (open) {
      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [slot, open, restaurants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time range
    if (formData.end_time <= formData.start_time) {
      toast({ variant: 'destructive', title: 'Invalid time range', description: 'End time must be after start time' });
      return;
    }
    
    // Calculate duration in hours
    const [startH, startM] = formData.start_time.split(':').map(Number);
    const [endH, endM] = formData.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationHours = (endMinutes - startMinutes) / 60;
    
    // Warn if duration is unrealistically long (> 6 hours)
    if (durationHours > 6) {
      toast({ 
        variant: 'destructive', 
        title: 'Unusually long duration', 
        description: `Duration is ${durationHours.toFixed(1)} hours. Please check start and end times are correct.` 
      });
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
              ref={dateInputRef}
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                className="h-12"
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

          <div className="flex justify-between gap-3 pt-4">
            {slot && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {bookingCount === 0 ? 'Delete' : 'Close'} Slot
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : slot ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Delete/Close Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bookingCount === 0 ? 'Delete this time slot?' : 'Close this time slot?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bookingCount === 0 
                ? 'This action will permanently remove the slot. This cannot be undone.'
                : `This slot has ${bookingCount} existing reservation${bookingCount === 1 ? '' : 's'}. We will close it to new reservations but keep it in history. Guests will no longer see it as available.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Processing...' : bookingCount === 0 ? 'Delete Slot' : 'Close Slot'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
