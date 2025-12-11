import { useState, useEffect, useRef, useMemo } from 'react';
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
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, getDay } from 'date-fns';
import { Trash2, Clock, Info, RefreshCw } from 'lucide-react';

// Quick time presets for common meal periods
const TIME_PRESETS = [
  { label: 'Breakfast', start: '07:00', end: '10:00', period: 'BREAKFAST' as MealPeriod },
  { label: 'Lunch', start: '12:00', end: '14:00', period: 'LUNCH' as MealPeriod },
  { label: 'Dinner', start: '19:00', end: '21:00', period: 'DINNER' as MealPeriod },
  { label: 'Late Dinner', start: '20:00', end: '22:00', period: 'DINNER' as MealPeriod },
];

interface RecurringRuleMatch {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  meal_period: MealPeriod;
  frequency: string;
}

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
  const [matchingRule, setMatchingRule] = useState<RecurringRuleMatch | null>(null);
  const [isModifiedFromRule, setIsModifiedFromRule] = useState(false);
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
      // Check if this slot matches a recurring rule
      checkRecurringRule(slot.restaurant_id, slot.date, slot.start_time.slice(0, 5), slot.end_time.slice(0, 5), slot.capacity, slot.meal_period);
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
      setMatchingRule(null);
      setIsModifiedFromRule(false);
    }
    // Auto-focus date field when dialog opens
    if (open) {
      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [slot, open, restaurants]);

  // Check if slot matches a recurring rule
  const checkRecurringRule = async (restaurantId: string, date: string, startTime: string, endTime: string, capacity: number, mealPeriod: MealPeriod) => {
    if (!resortId || !restaurantId) return;
    
    const slotDate = parseISO(date);
    const dayOfWeek = getDay(slotDate);
    
    const { data: rules } = await supabase
      .from('restaurant_recurring_rules')
      .select('id, start_time, end_time, capacity, meal_period, frequency, days_of_week, start_date, end_date, is_active')
      .eq('resort_id', resortId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .lte('start_date', date)
      .gte('end_date', date);
    
    if (rules && rules.length > 0) {
      // Find a matching rule
      const match = rules.find(rule => {
        const ruleStartTime = rule.start_time.slice(0, 5);
        const ruleDays = rule.days_of_week || [0, 1, 2, 3, 4, 5, 6];
        return ruleDays.includes(dayOfWeek) && ruleStartTime === startTime;
      });
      
      if (match) {
        setMatchingRule({
          id: match.id,
          start_time: match.start_time.slice(0, 5),
          end_time: match.end_time.slice(0, 5),
          capacity: match.capacity,
          meal_period: match.meal_period,
          frequency: match.frequency,
        });
        // Check if slot differs from rule
        const ruleEndTime = match.end_time.slice(0, 5);
        const isModified = endTime !== ruleEndTime || capacity !== match.capacity || mealPeriod !== match.meal_period;
        setIsModifiedFromRule(isModified);
      } else {
        setMatchingRule(null);
        setIsModifiedFromRule(false);
      }
    } else {
      setMatchingRule(null);
      setIsModifiedFromRule(false);
    }
  };

  // Reset slot to recurring rule defaults
  const resetToRuleDefaults = () => {
    if (matchingRule) {
      setFormData(prev => ({
        ...prev,
        start_time: matchingRule.start_time,
        end_time: matchingRule.end_time,
        capacity: matchingRule.capacity,
        meal_period: matchingRule.meal_period,
      }));
      setIsModifiedFromRule(false);
    }
  };

  // Track modifications from rule
  useEffect(() => {
    if (matchingRule && slot) {
      const isModified = 
        formData.end_time !== matchingRule.end_time || 
        formData.capacity !== matchingRule.capacity ||
        formData.start_time !== matchingRule.start_time ||
        formData.meal_period !== matchingRule.meal_period;
      setIsModifiedFromRule(isModified);
    }
  }, [formData.start_time, formData.end_time, formData.capacity, formData.meal_period, matchingRule, slot]);

  // Get selected restaurant's opening hours
  const selectedRestaurant = restaurants.find(r => r.id === formData.restaurant_id);
  const openingTime = (selectedRestaurant as any)?.opening_time?.slice(0, 5) || '06:00';
  const closingTime = (selectedRestaurant as any)?.closing_time?.slice(0, 5) || '23:00';

  // Validate slot is within opening hours
  const isOutsideOpeningHours = formData.start_time < openingTime || formData.end_time > closingTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time range
    if (formData.end_time <= formData.start_time) {
      toast({ variant: 'destructive', title: 'Invalid time range', description: 'End time must be after start time' });
      return;
    }

    // Validate against restaurant opening hours
    if (isOutsideOpeningHours) {
      toast({ 
        variant: 'destructive', 
        title: 'Outside opening hours', 
        description: `${selectedRestaurant?.name || 'Restaurant'} is open ${openingTime} – ${closingTime}. Slot times must be within opening hours.` 
      });
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

  // Calculate duration for display
  const duration = useMemo(() => {
    const [startH, startM] = formData.start_time.split(':').map(Number);
    const [endH, endM] = formData.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) return null;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  }, [formData.start_time, formData.end_time]);

  const applyPreset = (preset: typeof TIME_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      start_time: preset.start,
      end_time: preset.end,
      meal_period: preset.period,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{slot ? 'Edit Time Slot' : 'New Time Slot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recurring rule indicator */}
          {slot && matchingRule && (
            <div className={`p-3 rounded-lg border ${isModifiedFromRule ? 'bg-amber-500/10 border-amber-300' : 'bg-primary/5 border-primary/20'}`}>
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Part of recurring schedule</span>
                    <Badge variant="secondary" className="text-xs">
                      {matchingRule.frequency === 'DAILY' ? 'Daily' : 'Weekly'}
                    </Badge>
                    {isModifiedFromRule && (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Changes here only affect this specific date, not the recurring rule.
                  </p>
                  {isModifiedFromRule && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs mt-1"
                      onClick={resetToRuleDefaults}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Reset to defaults ({matchingRule.start_time} - {matchingRule.end_time}, {matchingRule.capacity} covers)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Restaurant *</Label>
            <Select
              value={formData.restaurant_id}
              onValueChange={(v) => setFormData({ ...formData, restaurant_id: v })}
              disabled={!!slot}
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
              disabled={!!slot && !!matchingRule}
              className="h-12"
            />
            {slot && matchingRule && (
              <p className="text-xs text-muted-foreground">Date cannot be changed for recurring slots. Create a new slot instead.</p>
            )}
          </div>

          {/* Quick time presets */}
          {!slot && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Quick presets</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Time Range *</Label>
              {duration && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration: {duration}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start_time" className="text-xs text-muted-foreground">Start</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    // Auto-suggest meal period based on start time
                    const hour = parseInt(newStartTime.split(':')[0], 10);
                    let suggestedPeriod = formData.meal_period;
                    if (hour >= 6 && hour < 11) suggestedPeriod = 'BREAKFAST';
                    else if (hour >= 11 && hour < 15) suggestedPeriod = 'LUNCH';
                    else if (hour >= 17 && hour < 23) suggestedPeriod = 'DINNER';
                    setFormData({ ...formData, start_time: newStartTime, meal_period: suggestedPeriod });
                  }}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_time" className="text-xs text-muted-foreground">End</Label>
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
            {formData.end_time <= formData.start_time && formData.end_time !== '' && (
              <p className="text-xs text-destructive">End time must be after start time</p>
            )}
            {isOutsideOpeningHours && formData.end_time > formData.start_time && selectedRestaurant && (
              <p className="text-xs text-destructive">
                Slot outside opening hours ({openingTime} – {closingTime})
              </p>
            )}
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
            <NumericInput
              min={1}
              value={formData.capacity}
              onChange={(value) => setFormData({ ...formData, capacity: value })}
              defaultValue={1}
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
              <Button type="submit" disabled={loading || formData.end_time <= formData.start_time || isOutsideOpeningHours}>
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
