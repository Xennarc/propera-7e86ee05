import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ActivityRecurringRule, RecurrenceFrequency } from '@/types/database';
import { generateActivitySessions } from '@/lib/recurring-schedule';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, addMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

interface ActivityRecurringRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ActivityRecurringRule | null;
  activity: Activity;
  resortId: string;
  onSuccess: () => void;
}

export function ActivityRecurringRuleDialog({
  open,
  onOpenChange,
  rule,
  activity,
  resortId,
  onSuccess,
}: ActivityRecurringRuleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [regenerateOnSave, setRegenerateOnSave] = useState(true);
  const [formData, setFormData] = useState({
    start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    end_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    frequency: 'WEEKLY' as RecurrenceFrequency,
    days_of_week: [1, 3, 5] as number[], // Mon, Wed, Fri default
    start_time: '10:00',
    end_time: '12:00',
    capacity: activity.default_max_capacity,
    is_active: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    if (rule) {
      setFormData({
        start_date: rule.start_date,
        end_date: rule.end_date,
        frequency: rule.frequency,
        days_of_week: rule.days_of_week,
        start_time: rule.start_time.slice(0, 5),
        end_time: rule.end_time.slice(0, 5),
        capacity: rule.capacity,
        is_active: rule.is_active,
      });
    } else {
      setFormData({
        start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        end_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        frequency: 'WEEKLY',
        days_of_week: [1, 3, 5],
        start_time: '10:00',
        end_time: '12:00',
        capacity: activity.default_max_capacity,
        is_active: true,
      });
    }
  }, [rule, activity, open]);

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.end_date < formData.start_date) {
      toast({ variant: 'destructive', title: 'Invalid dates', description: 'End date must be after start date' });
      return;
    }
    
    if (formData.end_time <= formData.start_time) {
      toast({ variant: 'destructive', title: 'Invalid times', description: 'End time must be after start time' });
      return;
    }

    if (formData.frequency === 'WEEKLY' && formData.days_of_week.length === 0) {
      toast({ variant: 'destructive', title: 'Select days', description: 'Please select at least one day of the week' });
      return;
    }

    setLoading(true);

    const payload = {
      resort_id: resortId,
      activity_id: activity.id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      frequency: formData.frequency,
      days_of_week: formData.frequency === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : formData.days_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      capacity: formData.capacity,
      is_active: formData.is_active,
    };

    try {
      let savedRule: ActivityRecurringRule;
      
      if (rule) {
        const { data, error } = await supabase
          .from('activity_recurring_rules')
          .update(payload)
          .eq('id', rule.id)
          .select()
          .single();
        if (error) throw error;
        savedRule = data as ActivityRecurringRule;
      } else {
        const { data, error } = await supabase
          .from('activity_recurring_rules')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        savedRule = data as ActivityRecurringRule;
      }

      // Generate sessions if rule is active and regeneration is requested
      if (savedRule.is_active && regenerateOnSave) {
        const result = await generateActivitySessions(savedRule);
        toast({
          title: 'Success',
          description: `Schedule saved. Created ${result.created} session${result.created !== 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}.`,
        });
      } else if (!savedRule.is_active) {
        toast({ title: 'Success', description: 'Recurring schedule saved (inactive)' });
      } else {
        toast({ title: 'Success', description: 'Recurring schedule updated. Use "Regenerate Future" to create new sessions.' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Recurring Schedule' : 'Add Recurring Schedule'}</DialogTitle>
          <DialogDescription>
            {activity.name} • Propera will generate sessions between these dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(v) => setFormData({ ...formData, frequency: v as RecurrenceFrequency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Every day</SelectItem>
                <SelectItem value="WEEKLY">On selected days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.frequency === 'WEEKLY' && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                      formData.days_of_week.includes(day.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={formData.days_of_week.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Capacity per session</Label>
            <Input
              type="number"
              min={1}
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {formData.is_active && (
            <div className="flex items-center justify-between py-2 border-t pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="regenerate">Regenerate future sessions</Label>
                <p className="text-xs text-muted-foreground">
                  {rule ? 'Create new sessions based on updated schedule' : 'Create sessions now'}
                </p>
              </div>
              <Switch
                id="regenerate"
                checked={regenerateOnSave}
                onCheckedChange={setRegenerateOnSave}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            You can still edit or cancel individual sessions after they are generated.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {rule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
