import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Activity, Resource } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Check, Calendar, Users, Clock, CalendarDays, Repeat, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO, getDay, isBefore, isAfter, addMinutes, parse, min } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage, LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

type ScheduleType = 'single' | 'recurring';
type RecurringFrequency = 'daily' | 'selected';

interface SessionPreviewRow {
  id: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
  included: boolean;
  isClosed: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CreateSessionWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentResort } = useResort();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [closureDates, setClosureDates] = useState<Set<string>>(new Set());
  const [existingSessions, setExistingSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Activity selection
  const preselectedActivityId = searchParams.get('activityId');
  const [selectedActivityId, setSelectedActivityId] = useState<string>(preselectedActivityId || '');

  // Step 2: Schedule type
  const [scheduleType, setScheduleType] = useState<ScheduleType>('single');
  
  // Single session fields
  const [singleDate, setSingleDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [singleStartTime, setSingleStartTime] = useState('09:00');
  const [singleEndTime, setSingleEndTime] = useState('10:00');
  const [singleCapacity, setSingleCapacity] = useState(10);
  const [singleResourceId, setSingleResourceId] = useState('');

  // Recurring fields
  const [recurringStartDate, setRecurringStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [recurringEndDate, setRecurringEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('10:00');
  const [recurringCapacity, setRecurringCapacity] = useState(10);

  // Step 3: Preview rows
  const [previewRows, setPreviewRows] = useState<SessionPreviewRow[]>([]);

  const selectedActivity = useMemo(
    () => activities.find(a => a.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  // Fetch data on mount
  useEffect(() => {
    if (!currentResort) return;

    const fetchData = async () => {
      setLoading(true);
      
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
    if (!selectedActivity) return;
    
    const calculateEndTime = (startTime: string) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + selectedActivity.duration_minutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    setSingleEndTime(calculateEndTime(singleStartTime));
    setRecurringEndTime(calculateEndTime(recurringStartTime));
  }, [selectedActivity, singleStartTime, recurringStartTime]);

  // Set default capacity when activity changes
  useEffect(() => {
    if (selectedActivity) {
      setSingleCapacity(selectedActivity.default_max_capacity);
      setRecurringCapacity(selectedActivity.default_max_capacity);
    }
  }, [selectedActivity]);

  // Fetch closure dates and existing sessions when activity changes
  useEffect(() => {
    if (!selectedActivityId) {
      setClosureDates(new Set());
      setExistingSessions(new Set());
      return;
    }

    const fetchActivityData = async () => {
      const [closuresRes, sessionsRes] = await Promise.all([
        supabase
          .from('activity_closures')
          .select('closure_date')
          .eq('activity_id', selectedActivityId)
          .gte('closure_date', format(new Date(), 'yyyy-MM-dd')),
        supabase
          .from('activity_sessions')
          .select('date, start_time')
          .eq('activity_id', selectedActivityId)
          .neq('status', 'CANCELLED')
          .gte('date', format(new Date(), 'yyyy-MM-dd'))
      ]);
      
      setClosureDates(new Set(closuresRes.data?.map(c => c.closure_date) || []));
      setExistingSessions(new Set(
        sessionsRes.data?.map(s => `${s.date}_${s.start_time.slice(0, 5)}`) || []
      ));
    };

    fetchActivityData();
  }, [selectedActivityId]);

  // Generate preview rows when entering step 3
  useEffect(() => {
    if (currentStep !== 3) return;

    const checkDuplicateStatus = (date: string, startTime: string): { isDuplicate: boolean; reason?: string } => {
      const key = `${date}_${startTime.slice(0, 5)}`;
      if (existingSessions.has(key)) {
        return { isDuplicate: true, reason: 'Session already exists at this time' };
      }
      return { isDuplicate: false };
    };

    if (scheduleType === 'single') {
      const isClosed = closureDates.has(singleDate);
      const { isDuplicate, reason } = checkDuplicateStatus(singleDate, singleStartTime);
      setPreviewRows([{
        id: '1',
        date: singleDate,
        dayOfWeek: DAY_NAMES[getDay(parseISO(singleDate))],
        startTime: singleStartTime,
        endTime: singleEndTime,
        capacity: singleCapacity,
        included: !isClosed && !isDuplicate,
        isClosed,
        isDuplicate,
        duplicateReason: reason,
      }]);
    } else {
      // Generate recurring preview
      const rows: SessionPreviewRow[] = [];
      const start = parseISO(recurringStartDate);
      const end = parseISO(recurringEndDate);
      const horizon = addDays(new Date(), 90);
      const effectiveEnd = min([end, horizon]);
      
      let current = start;
      let idCounter = 1;
      
      while (!isAfter(current, effectiveEnd)) {
        const dayOfWeek = getDay(current);
        const dateStr = format(current, 'yyyy-MM-dd');
        
        const shouldInclude = recurringFrequency === 'daily' || selectedDays.includes(dayOfWeek);
        
        if (shouldInclude && !isBefore(current, new Date(format(new Date(), 'yyyy-MM-dd')))) {
          const isClosed = closureDates.has(dateStr);
          const { isDuplicate, reason } = checkDuplicateStatus(dateStr, recurringStartTime);
          rows.push({
            id: String(idCounter++),
            date: dateStr,
            dayOfWeek: DAY_NAMES[dayOfWeek],
            startTime: recurringStartTime,
            endTime: recurringEndTime,
            capacity: recurringCapacity,
            included: !isClosed && !isDuplicate,
            isClosed,
            isDuplicate,
            duplicateReason: reason,
          });
        }
        current = addDays(current, 1);
      }
      
      setPreviewRows(rows);
    }
  }, [currentStep, scheduleType, singleDate, singleStartTime, singleEndTime, singleCapacity, 
      recurringStartDate, recurringEndDate, recurringFrequency, selectedDays, 
      recurringStartTime, recurringEndTime, recurringCapacity, closureDates, existingSessions]);

  // Update duplicate status when time changes in preview
  const updatePreviewRow = (id: string, updates: Partial<SessionPreviewRow>) => {
    setPreviewRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const newRow = { ...row, ...updates };
      
      // Re-check duplicate status if time changed
      if (updates.startTime !== undefined) {
        const key = `${newRow.date}_${newRow.startTime.slice(0, 5)}`;
        const isDuplicate = existingSessions.has(key);
        newRow.isDuplicate = isDuplicate;
        newRow.duplicateReason = isDuplicate ? 'Session already exists at this time' : undefined;
        // Auto-exclude duplicates
        if (isDuplicate) newRow.included = false;
      }
      
      return newRow;
    }));
  };

  const toggleRowInclusion = (id: string) => {
    setPreviewRows(prev => prev.map(row => 
      row.id === id && !row.isClosed && !row.isDuplicate ? { ...row, included: !row.included } : row
    ));
  };

  const includedRowsCount = previewRows.filter(r => r.included && !r.isClosed && !r.isDuplicate).length;
  const duplicateRowsCount = previewRows.filter(r => r.isDuplicate).length;

  const canProceedStep1 = !!selectedActivityId;
  const canProceedStep2 = scheduleType === 'single' 
    ? !!singleDate && !!singleStartTime && singleCapacity > 0
    : !!recurringStartDate && !!recurringEndDate && !!recurringStartTime && recurringCapacity > 0 &&
      (recurringFrequency === 'daily' || selectedDays.length > 0);
  const canProceedStep3 = includedRowsCount > 0;

  const handleCreate = async () => {
    if (!currentResort || !selectedActivityId) return;

    setCreating(true);
    setError(null);

    try {
      const sessionsToCreate = previewRows
        .filter(r => r.included && !r.isClosed && !r.isDuplicate)
        .map(r => ({
          resort_id: currentResort.id,
          activity_id: selectedActivityId,
          date: r.date,
          start_time: r.startTime,
          end_time: r.endTime,
          capacity: r.capacity,
          resource_id: scheduleType === 'single' && singleResourceId ? singleResourceId : null,
          status: 'SCHEDULED' as const,
        }));

      if (sessionsToCreate.length === 0) {
        setError('No sessions selected to create.');
        setCreating(false);
        return;
      }

      // Check for duplicates
      const { data: existingSessions } = await supabase
        .from('activity_sessions')
        .select('date, start_time')
        .eq('activity_id', selectedActivityId)
        .in('date', sessionsToCreate.map(s => s.date));

      const existingSet = new Set(
        existingSessions?.map(s => `${s.date}_${s.start_time.slice(0, 5)}`) || []
      );

      const newSessions = sessionsToCreate.filter(
        s => !existingSet.has(`${s.date}_${s.start_time.slice(0, 5)}`)
      );

      if (newSessions.length === 0) {
        setError('All selected sessions already exist.');
        setCreating(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('activity_sessions')
        .insert(newSessions);

      if (insertError) throw insertError;

      // Optionally create recurring rule for tracking
      if (scheduleType === 'recurring') {
        await supabase
          .from('activity_recurring_rules')
          .insert({
            resort_id: currentResort.id,
            activity_id: selectedActivityId,
            start_date: recurringStartDate,
            end_date: recurringEndDate,
            frequency: recurringFrequency === 'daily' ? 'DAILY' : 'WEEKLY',
            days_of_week: recurringFrequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : selectedDays,
            start_time: recurringStartTime,
            end_time: recurringEndTime,
            capacity: recurringCapacity,
            is_active: true,
          });
      }

      const skipped = sessionsToCreate.length - newSessions.length;
      toast({
        title: 'Success',
        description: `Created ${newSessions.length} session${newSessions.length !== 1 ? 's' : ''} for ${selectedActivity?.name}${skipped > 0 ? ` (${skipped} skipped as duplicates)` : ''}.`,
      });

      navigate('/staff/activities/sessions');
    } catch (err: any) {
      console.error('Create sessions error:', err);
      setError(err.message || 'Failed to create sessions. Please try again.');
    } finally {
      setCreating(false);
    }
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
          <h1 className="text-2xl font-bold">Create Sessions</h1>
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/staff/activities/sessions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Sessions</h1>
          <p className="text-muted-foreground">Schedule activity sessions step by step</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 py-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 3 && (
              <div className={cn(
                "w-16 h-0.5 mx-2",
                currentStep > step ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        {/* Step 1: Choose Activity */}
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Choose Activity
              </CardTitle>
              <CardDescription>
                Select the activity you want to create sessions for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {preselectedActivityId && selectedActivity ? (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm text-muted-foreground">Activity</Label>
                  <p className="text-lg font-medium">{selectedActivity.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedActivity.duration_minutes} minutes • ${selectedActivity.default_price_per_person}/person
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Activity *</Label>
                  <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                    <SelectTrigger className="h-12">
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
                </div>
              )}
              
              {selectedActivity && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{selectedActivity.duration_minutes}</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{selectedActivity.default_max_capacity}</p>
                    <p className="text-xs text-muted-foreground">Default Capacity</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">${selectedActivity.default_price_per_person}</p>
                    <p className="text-xs text-muted-foreground">Per Person</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold capitalize">{selectedActivity.category.toLowerCase()}</p>
                    <p className="text-xs text-muted-foreground">Category</p>
                  </div>
                </div>
              )}
            </CardContent>
          </>
        )}

        {/* Step 2: Schedule Type */}
        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Type
              </CardTitle>
              <CardDescription>
                Choose how you want to schedule sessions for {selectedActivity?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={scheduleType}
                onValueChange={(v) => setScheduleType(v as ScheduleType)}
                className="grid gap-4 sm:grid-cols-2"
              >
                <Label
                  htmlFor="single"
                  className={cn(
                    "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                    scheduleType === 'single' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value="single" id="single" className="mt-1" />
                  <div>
                    <p className="font-medium">Single Session</p>
                    <p className="text-sm text-muted-foreground">
                      Create one session for a specific date and time
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="recurring"
                  className={cn(
                    "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                    scheduleType === 'recurring' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value="recurring" id="recurring" className="mt-1" />
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Recurring Sessions
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Create multiple sessions on a repeating pattern
                    </p>
                  </div>
                </Label>
              </RadioGroup>

              <div className="border-t pt-6">
                {scheduleType === 'single' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input
                          type="date"
                          value={singleDate}
                          onChange={(e) => setSingleDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={singleCapacity}
                          onChange={(e) => setSingleCapacity(parseInt(e.target.value) || 1)}
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Start Time *</Label>
                        <Input
                          type="time"
                          value={singleStartTime}
                          onChange={(e) => setSingleStartTime(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time *</Label>
                        <Input
                          type="time"
                          value={singleEndTime}
                          onChange={(e) => setSingleEndTime(e.target.value)}
                          className="h-12"
                        />
                      </div>
                    </div>
                    {resources.length > 0 && (
                      <div className="space-y-2">
                        <Label>Resource (Optional)</Label>
                        <Select value={singleResourceId || "__none__"} onValueChange={(v) => setSingleResourceId(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="No resource assigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No resource assigned</SelectItem>
                            {resources.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Start Date *</Label>
                        <Input
                          type="date"
                          value={recurringStartDate}
                          onChange={(e) => setRecurringStartDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Input
                          type="date"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          min={recurringStartDate}
                          className="h-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Frequency *</Label>
                      <RadioGroup
                        value={recurringFrequency}
                        onValueChange={(v) => setRecurringFrequency(v as RecurringFrequency)}
                        className="flex gap-4"
                      >
                        <Label
                          htmlFor="daily"
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors",
                            recurringFrequency === 'daily' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem value="daily" id="daily" />
                          <span>Every day</span>
                        </Label>
                        <Label
                          htmlFor="selected"
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors",
                            recurringFrequency === 'selected' ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem value="selected" id="selected" />
                          <span>Selected days</span>
                        </Label>
                      </RadioGroup>
                    </div>

                    {recurringFrequency === 'selected' && (
                      <div className="space-y-2">
                        <Label>Days of Week *</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAY_ABBREVIATIONS.map((day, index) => (
                            <Label
                              key={day}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors",
                                selectedDays.includes(index) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                              )}
                            >
                              <Checkbox
                                checked={selectedDays.includes(index)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDays(prev => [...prev, index].sort());
                                  } else {
                                    setSelectedDays(prev => prev.filter(d => d !== index));
                                  }
                                }}
                              />
                              {day}
                            </Label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Start Time *</Label>
                        <Input
                          type="time"
                          value={recurringStartTime}
                          onChange={(e) => setRecurringStartTime(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time *</Label>
                        <Input
                          type="time"
                          value={recurringEndTime}
                          onChange={(e) => setRecurringEndTime(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={recurringCapacity}
                          onChange={(e) => setRecurringCapacity(parseInt(e.target.value) || 1)}
                          className="h-12"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: Review & Customize */}
        {currentStep === 3 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Review and Customize
              </CardTitle>
              <CardDescription>
                Review the sessions that will be created. You can adjust times or exclude specific dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{selectedActivity?.name}</span>
                <div className="flex items-center gap-3 text-sm">
                  {duplicateRowsCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-500">
                      {duplicateRowsCount} duplicate{duplicateRowsCount !== 1 ? 's' : ''} skipped
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {includedRowsCount} session{includedRowsCount !== 1 ? 's' : ''} will be created
                  </span>
                </div>
              </div>

              {duplicateRowsCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">
                    {duplicateRowsCount} session{duplicateRowsCount !== 1 ? 's' : ''} already exist and will be skipped. 
                    You can change the time to create a new session at a different time.
                  </p>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-3 text-left w-12">
                          <Checkbox
                            checked={previewRows.filter(r => !r.isClosed && !r.isDuplicate).every(r => r.included)}
                            onCheckedChange={(checked) => {
                              setPreviewRows(prev => prev.map(r => 
                                r.isClosed || r.isDuplicate ? r : { ...r, included: !!checked }
                              ));
                            }}
                          />
                        </th>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Day</th>
                        <th className="p-3 text-left">Start</th>
                        <th className="p-3 text-left">End</th>
                        <th className="p-3 text-left">Capacity</th>
                        <th className="p-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewRows.map((row) => (
                        <tr 
                          key={row.id} 
                          className={cn(
                            row.isClosed && "bg-muted/30 opacity-60",
                            row.isDuplicate && "bg-amber-500/5",
                            !row.included && !row.isClosed && !row.isDuplicate && "opacity-50"
                          )}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={row.included}
                              onCheckedChange={() => toggleRowInclusion(row.id)}
                              disabled={row.isClosed || row.isDuplicate}
                            />
                          </td>
                          <td className="p-3 font-medium">
                            {format(parseISO(row.date), 'MMM d, yyyy')}
                          </td>
                          <td className="p-3 text-muted-foreground">{row.dayOfWeek}</td>
                          <td className="p-3">
                            <Input
                              type="time"
                              value={row.startTime}
                              onChange={(e) => updatePreviewRow(row.id, { startTime: e.target.value })}
                              disabled={row.isClosed || !row.included}
                              className="w-28 h-9"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="time"
                              value={row.endTime}
                              onChange={(e) => updatePreviewRow(row.id, { endTime: e.target.value })}
                              disabled={row.isClosed || !row.included}
                              className="w-28 h-9"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={1}
                              value={row.capacity}
                              onChange={(e) => updatePreviewRow(row.id, { capacity: parseInt(e.target.value) || 1 })}
                              disabled={row.isClosed || !row.included}
                              className="w-20 h-9"
                            />
                          </td>
                          <td className="p-3">
                            {row.isClosed ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-destructive/10 text-destructive">
                                Closed
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400" title={row.duplicateReason}>
                                Already exists
                              </span>
                            ) : row.included ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                Will create
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                                Excluded
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewRows.length > 90 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing sessions for the next 90 days. Additional sessions beyond this horizon can be generated later.
                </p>
              )}
            </CardContent>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                navigate('/staff/activities/sessions');
              } else {
                setCurrentStep(prev => prev - 1);
                setError(null);
              }
            }}
            disabled={creating}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceedStep3 || creating}
            >
              {creating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create {includedRowsCount} Session{includedRowsCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
