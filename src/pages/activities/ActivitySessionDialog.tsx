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
import { NumericInput } from '@/components/ui/numeric-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/hooks/use-toast';
import { format, addMinutes, parse, parseISO, getDay } from 'date-fns';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecurringRuleMatch {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  frequency: string;
}

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
  const [matchingRule, setMatchingRule] = useState<RecurringRuleMatch | null>(null);
  const [isModifiedFromRule, setIsModifiedFromRule] = useState(false);
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
      // Check if this session matches a recurring rule
      checkRecurringRule(session.activity_id, session.date, session.start_time.slice(0, 5), session.end_time.slice(0, 5), session.capacity);
    } else {
      // Reset to clean defaults for new session - NO pre-selection of activity
      setFormData({
        activity_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '',
        end_time: '',
        capacity: 10,
        resource_id: '',
        status: 'SCHEDULED',
        notes: '',
      });
      setMatchingRule(null);
      setIsModifiedFromRule(false);
    }
    // Auto-focus date field when dialog opens
    if (open) {
      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [session, open]);

  // Check if session matches a recurring rule
  const checkRecurringRule = async (activityId: string, date: string, startTime: string, endTime: string, capacity: number) => {
    if (!resortId || !activityId) return;
    
    const sessionDate = parseISO(date);
    const dayOfWeek = getDay(sessionDate);
    
    const { data: rules } = await supabase
      .from('activity_recurring_rules')
      .select('id, start_time, end_time, capacity, frequency, days_of_week, start_date, end_date, is_active')
      .eq('resort_id', resortId)
      .eq('activity_id', activityId)
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
          frequency: match.frequency,
        });
        // Check if session differs from rule
        const ruleEndTime = match.end_time.slice(0, 5);
        const isModified = endTime !== ruleEndTime || capacity !== match.capacity;
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

  // Reset session to recurring rule defaults
  const resetToRuleDefaults = () => {
    if (matchingRule) {
      setFormData(prev => ({
        ...prev,
        start_time: matchingRule.start_time,
        end_time: matchingRule.end_time,
        capacity: matchingRule.capacity,
      }));
      setIsModifiedFromRule(false);
    }
  };

  // Track modifications from rule
  useEffect(() => {
    if (matchingRule && session) {
      const isModified = 
        formData.end_time !== matchingRule.end_time || 
        formData.capacity !== matchingRule.capacity ||
        formData.start_time !== matchingRule.start_time;
      setIsModifiedFromRule(isModified);
    }
  }, [formData.start_time, formData.end_time, formData.capacity, matchingRule, session]);

  useEffect(() => {
    fetchResources();
  }, [resortId]);

  // Auto-calculate end time based on activity duration (only for new sessions)
  useEffect(() => {
    if (formData.activity_id && formData.start_time && !session) {
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
    if (!formData.start_time) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please set a start time' });
      return;
    }
    if (!formData.end_time) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please set an end time' });
      return;
    }
    if (!resortId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No resort selected' });
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate session (same activity, date, and start time)
      const { data: existingSessions } = await supabase
        .from('activity_sessions')
        .select('id, date, start_time')
        .eq('activity_id', formData.activity_id)
        .eq('date', formData.date)
        .neq('status', 'CANCELLED');

      const startTimeNormalized = formData.start_time.slice(0, 5);
      const duplicate = existingSessions?.find(
        s => s.start_time.slice(0, 5) === startTimeNormalized && s.id !== session?.id
      );

      if (duplicate) {
        const activity = activities.find(a => a.id === formData.activity_id);
        toast({ 
          variant: 'destructive', 
          title: 'Session already exists', 
          description: `${activity?.name || 'This activity'} already has a session on ${formData.date} at ${formData.start_time}` 
        });
        setLoading(false);
        return;
      }

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Session' : 'New Activity Session'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Recurring rule indicator */}
          {session && matchingRule && (
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
                      Reset to schedule defaults ({matchingRule.start_time} - {matchingRule.end_time}, {matchingRule.capacity} pax)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

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
                disabled={!!session}
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
              disabled={!!session && !!matchingRule}
              className="h-12"
            />
            {session && matchingRule && (
              <p className="text-xs text-muted-foreground">Date cannot be changed for recurring sessions. Create a new session instead.</p>
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
              defaultValue={1}
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
