import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Resource } from '@/types/database';
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
import { NumericInput } from '@/components/ui/numeric-input';
import { useToast } from '@/hooks/use-toast';
import { format, addMinutes, parse } from 'date-fns';

interface SessionTemplate {
  id: string;
  resort_id: string;
  activity_id: string;
  name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  resource_id: string | null;
  notes: string | null;
  is_active: boolean;
}

interface SessionTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: SessionTemplate | null;
  resortId: string;
  activities: Activity[];
  onSuccess: () => void;
}

export function SessionTemplateDialog({
  open,
  onOpenChange,
  template,
  resortId,
  activities,
  onSuccess,
}: SessionTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    activity_id: '',
    start_time: '09:00',
    end_time: '10:00',
    capacity: 10,
    resource_id: '',
    notes: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        activity_id: template.activity_id,
        start_time: template.start_time.slice(0, 5),
        end_time: template.end_time.slice(0, 5),
        capacity: template.capacity,
        resource_id: template.resource_id || '',
        notes: template.notes || '',
      });
    } else {
      setFormData({
        name: '',
        activity_id: activities[0]?.id || '',
        start_time: '09:00',
        end_time: '10:00',
        capacity: 10,
        resource_id: '',
        notes: '',
      });
    }
  }, [template, open, activities]);

  useEffect(() => {
    fetchResources();
  }, [resortId]);

  // Auto-calculate end time based on activity duration (only for new templates)
  useEffect(() => {
    if (formData.activity_id && formData.start_time && !template) {
      const activity = activities.find(a => a.id === formData.activity_id);
      if (activity) {
        const startTime = parse(formData.start_time, 'HH:mm', new Date());
        const endTime = addMinutes(startTime, activity.duration_minutes);
        setFormData(prev => ({
          ...prev,
          end_time: format(endTime, 'HH:mm'),
          capacity: prev.capacity === 10 ? activity.default_max_capacity : prev.capacity,
        }));
      }
    }
  }, [formData.activity_id, formData.start_time, activities, template]);

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

    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a template name' });
      return;
    }
    if (!formData.activity_id) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select an activity' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        resort_id: resortId,
        activity_id: formData.activity_id,
        name: formData.name.trim(),
        start_time: formData.start_time,
        end_time: formData.end_time,
        capacity: formData.capacity,
        resource_id: formData.resource_id || null,
        notes: formData.notes || null,
      };

      let error;
      if (template) {
        ({ error } = await supabase
          .from('activity_session_templates')
          .update(payload)
          .eq('id', template.id));
      } else {
        ({ error } = await supabase
          .from('activity_session_templates')
          .insert(payload));
      }

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Success', description: template ? 'Template updated' : 'Template created' });
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Template save error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const selectedActivity = activities.find(a => a.id === formData.activity_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'New Session Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Dive, Sunset Excursion"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Activity *</Label>
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
            {selectedActivity && (
              <p className="text-xs text-muted-foreground">
                Duration: {selectedActivity.duration_minutes} min • Default capacity: {selectedActivity.default_max_capacity}
              </p>
            )}
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
            <NumericInput
              min={1}
              value={formData.capacity}
              onChange={(value) => setFormData({ ...formData, capacity: value })}
              defaultValue={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Resource (optional)</Label>
            <Select
              value={formData.resource_id || "__none__"}
              onValueChange={(v) => setFormData({ ...formData, resource_id: v === "__none__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No resource assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No resource</SelectItem>
                {resources.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional template notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || activities.length === 0}>
              {loading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
