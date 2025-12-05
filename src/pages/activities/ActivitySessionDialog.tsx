import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ActivitySession, Resource, SessionStatus } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/hooks/use-toast';
import { format, addMinutes, parse } from 'date-fns';
import { AlertCircle } from 'lucide-react';

interface ActivitySessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ActivitySession | null;
  resortId: string;
  activities: Activity[];
  onSuccess: () => void;
}

export function ActivitySessionDialog({
  open,
  onOpenChange,
  session,
  resortId,
  activities,
  onSuccess,
}: ActivitySessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    activity_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    capacity: 10,
    resource_id: '',
    status: 'SCHEDULED' as SessionStatus,
    notes: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      setFormData({
        activity_id: session.activity_id,
        date: session.date,
        start_time: session.start_time.slice(0, 5),
        end_time: session.end_time.slice(0, 5),
        capacity: session.capacity,
        resource_id: session.resource_id || '',
        status: session.status,
        notes: session.notes || '',
      });
    } else {
      setFormData({
        activity_id: activities[0]?.id || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:00',
        capacity: 10,
        resource_id: '',
        status: 'SCHEDULED',
        notes: '',
      });
    }
    // Auto-focus date field when dialog opens
    if (open) {
      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [session, open, activities]);

  useEffect(() => {
    fetchResources();
  }, [resortId]);

  // Auto-calculate end time based on activity duration
  useEffect(() => {
    if (formData.activity_id && formData.start_time) {
      const activity = activities.find(a => a.id === formData.activity_id);
      if (activity) {
        const startTime = parse(formData.start_time, 'HH:mm', new Date());
        const endTime = addMinutes(startTime, activity.duration_minutes);
        setFormData(prev => ({
          ...prev,
          end_time: format(endTime, 'HH:mm'),
          capacity: session ? prev.capacity : activity.default_max_capacity,
        }));
      }
    }
  }, [formData.activity_id, formData.start_time, activities, session]);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('name');
    if (data) setResources(data as Resource[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.activity_id) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select an activity' });
      return;
    }
    if (!formData.date) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a date' });
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please set start and end times' });
      return;
    }
    if (!resortId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No resort selected' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        resort_id: resortId,
        activity_id: formData.activity_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        capacity: formData.capacity,
        resource_id: formData.resource_id || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      let error;
      if (session) {
        ({ error } = await supabase
          .from('activity_sessions')
          .update(payload)
          .eq('id', session.id));
      } else {
        ({ error } = await supabase
          .from('activity_sessions')
          .insert(payload));
      }

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Success', description: session ? 'Session updated successfully' : 'Session created successfully' });
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Session save error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Safety check - don't render if missing required props
  if (!resortId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm">No resort selected. Please select a resort first.</p>
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Session' : 'New Activity Session'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Activity *</Label>
            {activities.length === 0 ? (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">No activities available. Please create an activity first.</p>
              </div>
            ) : (
              <Select
                value={formData.activity_id}
                onValueChange={(v) => setFormData({ ...formData, activity_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <TimePicker
              label="Start Time *"
              value={formData.start_time}
              onChange={(v) => setFormData({ ...formData, start_time: v })}
            />
            <TimePicker
              label="End Time *"
              value={formData.end_time}
              onChange={(v) => setFormData({ ...formData, end_time: v })}
            />
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

          <div className="space-y-2">
            <Label>Resource (optional)</Label>
            <Select
              value={formData.resource_id}
              onValueChange={(v) => setFormData({ ...formData, resource_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No resource assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No resource</SelectItem>
                {resources.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {session && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as SessionStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional session notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || activities.length === 0}>
              {loading ? 'Saving...' : session ? 'Update Session' : 'Create Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
