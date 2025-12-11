import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Activity, Resource } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { ArrowLeft, Calendar, Users, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage } from '@/components/ui/loading-spinner';

export default function ActivitySessionCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentResort } = useResort();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    activity_id: '',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    capacity: 10,
    resource_id: '',
    notes: '',
  });

  useEffect(() => {
    if (!currentResort) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch activities and resources in parallel
      const [activitiesRes, resourcesRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .eq('resort_id', currentResort.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('resources')
          .select('*')
          .eq('resort_id', currentResort.id)
          .eq('is_active', true)
          .order('name'),
      ]);

      if (activitiesRes.data) setActivities(activitiesRes.data as Activity[]);
      if (resourcesRes.data) setResources(resourcesRes.data as Resource[]);
      
      setLoading(false);
    };

    fetchData();
  }, [currentResort]);

  // Auto-calculate end time when activity or start time changes
  useEffect(() => {
    if (!formData.activity_id || !formData.start_time) return;
    
    const activity = activities.find(a => a.id === formData.activity_id);
    if (!activity) return;

    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + activity.duration_minutes;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const newEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    
    setFormData(prev => ({ ...prev, end_time: newEndTime }));
  }, [formData.activity_id, formData.start_time, activities]);

  // Set default capacity from activity
  useEffect(() => {
    if (!formData.activity_id) return;
    
    const activity = activities.find(a => a.id === formData.activity_id);
    if (activity) {
      setFormData(prev => ({ ...prev, capacity: activity.default_max_capacity }));
    }
  }, [formData.activity_id, activities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentResort) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a resort first' });
      return;
    }

    if (!formData.activity_id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an activity' });
      return;
    }

    if (!formData.date) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date' });
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please set start and end times' });
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from('activity_sessions')
      .insert({
        resort_id: currentResort.id,
        activity_id: formData.activity_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        capacity: formData.capacity,
        resource_id: formData.resource_id || null,
        notes: formData.notes || null,
        status: 'SCHEDULED',
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }

    toast({ title: 'Success', description: 'Session created successfully' });
    navigate(`/staff/activities/sessions/${data.id}`);
  };

  if (!currentResort) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please select a resort first</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <LoadingPage />;
  }

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/staff/activities/sessions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">New Session</h1>
        </div>
        <EmptyState
          icon={Calendar}
          title="No activities available"
          description="You need to create activities first before scheduling sessions."
          action={
            <Button onClick={() => navigate('/staff/activities')}>
              Go to Activities
            </Button>
          }
        />
      </div>
    );
  }

  const selectedActivity = activities.find(a => a.id === formData.activity_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/staff/activities/sessions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Session</h1>
          <p className="text-muted-foreground">Schedule a new activity session</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Fill in the details to create a new activity session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Activity Selection */}
            <div className="space-y-2">
              <Label htmlFor="activity">Activity *</Label>
              <Select 
                value={formData.activity_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, activity_id: value }))}
              >
                <SelectTrigger id="activity">
                  <SelectValue placeholder="Select an activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name} ({activity.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedActivity && (
                <p className="text-sm text-muted-foreground">
                  Default price: ${selectedActivity.default_price_per_person}/person • 
                  Duration: {selectedActivity.duration_minutes} minutes
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <TimePicker
                label="Start Time *"
                value={formData.start_time}
                onChange={(v) => setFormData(prev => ({ ...prev, start_time: v }))}
              />
              <TimePicker
                label="End Time *"
                value={formData.end_time}
                onChange={(v) => setFormData(prev => ({ ...prev, end_time: v }))}
              />
            </div>

            {/* Capacity and Resource */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <NumericInput
                    id="capacity"
                    min={1}
                    value={formData.capacity}
                    onChange={(value) => setFormData(prev => ({ ...prev, capacity: value }))}
                    defaultValue={1}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource">Resource (Optional)</Label>
                <Select 
                  value={formData.resource_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, resource_id: value }))}
                >
                  <SelectTrigger id="resource">
                    <SelectValue placeholder="No resource assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No resource assigned</SelectItem>
                    {resources.map(resource => (
                      <SelectItem key={resource.id} value={resource.id}>
                        {resource.name} ({resource.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special notes or instructions for this session..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={saving || !formData.activity_id}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Creating...' : 'Create Session'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/staff/activities/sessions')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
