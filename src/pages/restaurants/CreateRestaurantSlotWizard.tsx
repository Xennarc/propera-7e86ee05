import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Restaurant, MealPeriod, RestaurantClosure } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { ArrowLeft, ArrowRight, Check, Utensils, Calendar, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

type ScheduleType = 'single' | 'recurring';
type FrequencyType = 'daily' | 'selected';

interface PreviewSlot {
  date: string;
  weekday: string;
  startTime: string;
  endTime: string;
  capacity: number;
  mealPeriod: MealPeriod;
  included: boolean;
  isClosed: boolean;
  hasExisting: boolean;
  isDuplicate: boolean;
  duplicateReason: string;
}

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const TIME_PRESETS = [
  { label: 'Breakfast', start: '07:00', end: '10:00', period: 'BREAKFAST' as MealPeriod },
  { label: 'Lunch', start: '12:00', end: '14:00', period: 'LUNCH' as MealPeriod },
  { label: 'Dinner', start: '19:00', end: '21:00', period: 'DINNER' as MealPeriod },
];

export default function CreateRestaurantSlotWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentResort } = useResort();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [closures, setClosures] = useState<RestaurantClosure[]>([]);
  const [existingSlots, setExistingSlots] = useState<Set<string>>(new Set());
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Step 1: Restaurant selection
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  // Step 2: Schedule type
  const [scheduleType, setScheduleType] = useState<ScheduleType>('single');
  const [singleDate, setSingleDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>('DINNER');
  const [capacity, setCapacity] = useState(50);

  // Recurring options
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // Step 3: Preview
  const [previewSlots, setPreviewSlots] = useState<PreviewSlot[]>([]);

  // Get pre-selected restaurant from URL
  const preselectedRestaurantId = searchParams.get('restaurantId');

  useEffect(() => {
    if (currentResort) {
      fetchRestaurants();
    }
  }, [currentResort]);

  useEffect(() => {
    if (preselectedRestaurantId && restaurants.length > 0) {
      const found = restaurants.find(r => r.id === preselectedRestaurantId);
      if (found) {
        setSelectedRestaurantId(found.id);
        setCapacity(found.total_capacity || 50);
      }
    }
  }, [preselectedRestaurantId, restaurants]);

  useEffect(() => {
    if (selectedRestaurantId && currentResort) {
      fetchClosures();
      fetchExistingSlots();
    }
  }, [selectedRestaurantId, currentResort, startDate, endDate, singleDate, scheduleType]);

  const fetchRestaurants = async () => {
    if (!currentResort) return;
    setLoading(true);
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('resort_id', currentResort.id)
      .eq('is_active', true)
      .order('name');
    if (data) {
      setRestaurants(data as Restaurant[]);
      if (data.length === 1 && !preselectedRestaurantId) {
        setSelectedRestaurantId(data[0].id);
        setCapacity(data[0].total_capacity || 50);
      }
    }
    setLoading(false);
  };

  const fetchClosures = async () => {
    if (!currentResort || !selectedRestaurantId) return;
    const { data } = await supabase
      .from('restaurant_closures')
      .select('*')
      .eq('resort_id', currentResort.id)
      .eq('restaurant_id', selectedRestaurantId);
    if (data) setClosures(data as RestaurantClosure[]);
  };

  const fetchExistingSlots = async () => {
    if (!currentResort || !selectedRestaurantId) return;
    setCheckingDuplicates(true);
    const dateRange = scheduleType === 'single' 
      ? { start: singleDate, end: singleDate }
      : { start: startDate, end: endDate };
    
    const { data } = await supabase
      .from('restaurant_time_slots')
      .select('date, start_time')
      .eq('resort_id', currentResort.id)
      .eq('restaurant_id', selectedRestaurantId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);
    
    if (data) {
      const slotSet = new Set(data.map(s => `${s.date}_${s.start_time.slice(0, 5)}`));
      setExistingSlots(slotSet);
    }
    setCheckingDuplicates(false);
  };

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);

  // Check if a slot is a duplicate (exists in DB or duplicates another row in preview)
  const checkDuplicate = (date: string, time: string, currentIndex: number, allSlots: PreviewSlot[]): { isDuplicate: boolean; reason: string } => {
    const key = `${date}_${time}`;
    
    // Check against existing slots in database
    if (existingSlots.has(key)) {
      return { isDuplicate: true, reason: 'Already exists in database' };
    }
    
    // Check against other rows in the preview (earlier in list)
    for (let i = 0; i < currentIndex; i++) {
      const other = allSlots[i];
      if (other.date === date && other.startTime === time && other.included) {
        return { isDuplicate: true, reason: 'Duplicates another row in this batch' };
      }
    }
    
    return { isDuplicate: false, reason: '' };
  };

  // Generate preview slots
  const generatePreview = () => {
    const closureDates = new Set(closures.map(c => c.closure_date));
    const slots: PreviewSlot[] = [];

    if (scheduleType === 'single') {
      const dateObj = parseISO(singleDate);
      const isClosed = closureDates.has(singleDate);
      const hasExisting = existingSlots.has(`${singleDate}_${startTime}`);
      const isDuplicate = hasExisting;
      slots.push({
        date: singleDate,
        weekday: format(dateObj, 'EEE'),
        startTime,
        endTime,
        capacity,
        mealPeriod,
        included: !isClosed && !isDuplicate,
        isClosed,
        hasExisting,
        isDuplicate,
        duplicateReason: isDuplicate ? 'Already exists in database' : '',
      });
    } else {
      let current = parseISO(startDate);
      const end = parseISO(endDate);
      const maxHorizon = addDays(new Date(), 90);
      const effectiveEnd = isAfter(end, maxHorizon) ? maxHorizon : end;

      while (!isAfter(current, effectiveEnd)) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const dayOfWeek = current.getDay();
        const shouldInclude = frequency === 'daily' || selectedDays.includes(dayOfWeek);

        if (shouldInclude) {
          const isClosed = closureDates.has(dateStr);
          const hasExisting = existingSlots.has(`${dateStr}_${startTime}`);
          const isDuplicate = hasExisting;
          slots.push({
            date: dateStr,
            weekday: format(current, 'EEE'),
            startTime,
            endTime,
            capacity,
            mealPeriod,
            included: !isClosed && !isDuplicate,
            isClosed,
            hasExisting,
            isDuplicate,
            duplicateReason: isDuplicate ? 'Already exists in database' : '',
          });
        }
        current = addDays(current, 1);
      }
    }

    setPreviewSlots(slots);
  };

  useEffect(() => {
    if (step === 3) {
      generatePreview();
    }
  }, [step]);

  const toggleSlotIncluded = (index: number) => {
    setPreviewSlots(prev => prev.map((slot, i) => 
      i === index && !slot.isClosed && !slot.isDuplicate
        ? { ...slot, included: !slot.included }
        : slot
    ));
  };

  const updateSlotField = (index: number, field: keyof PreviewSlot, value: any) => {
    setPreviewSlots(prev => {
      const updated = prev.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      );
      
      // If start time changed, re-check for duplicates
      if (field === 'startTime') {
        return updated.map((slot, i) => {
          if (i === index) {
            const { isDuplicate, reason } = checkDuplicate(slot.date, value, i, updated);
            return {
              ...slot,
              isDuplicate,
              duplicateReason: reason,
              included: slot.isClosed || isDuplicate ? false : slot.included,
            };
          }
          return slot;
        });
      }
      
      return updated;
    });
  };

  const includedCount = previewSlots.filter(s => s.included).length;
  const duplicateCount = previewSlots.filter(s => s.isDuplicate).length;

  const handleCreate = async () => {
    if (!currentResort || !selectedRestaurantId) return;
    
    const slotsToCreate = previewSlots.filter(s => s.included && !s.isDuplicate);
    if (slotsToCreate.length === 0) {
      toast({ variant: 'destructive', title: 'No slots selected', description: 'Please select at least one slot to create.' });
      return;
    }

    setCreating(true);

    try {
      // Create slots
      const payload = slotsToCreate.map(slot => ({
        resort_id: currentResort.id,
        restaurant_id: selectedRestaurantId,
        date: slot.date,
        start_time: slot.startTime,
        end_time: slot.endTime,
        meal_period: slot.mealPeriod,
        capacity: slot.capacity,
        status: 'OPEN' as const,
      }));

      const { error: slotsError } = await supabase
        .from('restaurant_time_slots')
        .insert(payload);

      if (slotsError) throw slotsError;

      // If recurring, optionally create a recurring rule
      if (scheduleType === 'recurring') {
        const rulePayload = {
          resort_id: currentResort.id,
          restaurant_id: selectedRestaurantId,
          start_date: startDate,
          end_date: endDate,
          frequency: (frequency === 'daily' ? 'DAILY' : 'WEEKLY') as 'DAILY' | 'WEEKLY',
          days_of_week: frequency === 'selected' ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
          start_time: startTime,
          end_time: endTime,
          meal_period: mealPeriod,
          capacity,
          is_active: true,
        };

        await supabase.from('restaurant_recurring_rules').insert([rulePayload]);
      }

      toast({
        title: 'Success',
        description: `Created ${slotsToCreate.length} time slot${slotsToCreate.length > 1 ? 's' : ''} for ${selectedRestaurant?.name}`,
      });

      navigate('/staff/restaurants/slots');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating slots',
        description: error.message || 'Please try again.',
      });
    } finally {
      setCreating(false);
    }
  };

  const applyPreset = (preset: typeof TIME_PRESETS[0]) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setMealPeriod(preset.period);
  };

  const canProceedStep1 = !!selectedRestaurantId;
  const canProceedStep2 = scheduleType === 'single' 
    ? singleDate && startTime && endTime && endTime > startTime
    : startDate && endDate && startTime && endTime && endTime > startTime && 
      (frequency === 'daily' || selectedDays.length > 0);

  if (!currentResort) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please select a resort first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Create Time Slots"
        description="Set up restaurant dining availability"
        action={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 mx-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Restaurant */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Choose Restaurant
            </CardTitle>
            <CardDescription>Select which restaurant you're creating time slots for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preselectedRestaurantId && selectedRestaurant ? (
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Restaurant</Label>
                <p className="font-medium">{selectedRestaurant.name}</p>
                <p className="text-sm text-muted-foreground">Creating time slots for this restaurant</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Restaurant *</Label>
                <Select value={selectedRestaurantId} onValueChange={(v) => {
                  setSelectedRestaurantId(v);
                  const rest = restaurants.find(r => r.id === v);
                  if (rest) setCapacity(rest.total_capacity || 50);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Schedule Type */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Type
            </CardTitle>
            <CardDescription>Choose single or recurring time slots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single">Single time slot</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="recurring" />
                <Label htmlFor="recurring">Recurring time slots</Label>
              </div>
            </RadioGroup>

            {scheduleType === 'single' ? (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Use this for one-time events or special dining slots.</p>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Create multiple slots on a repeating pattern. You can adjust individual dates in the next step.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <RadioGroup value={frequency} onValueChange={(v) => setFrequency(v as FrequencyType)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="daily" />
                      <Label htmlFor="daily">Every day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="selected" id="selected" />
                      <Label htmlFor="selected">Only on selected days</Label>
                    </div>
                  </RadioGroup>
                </div>

                {frequency === 'selected' && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(day => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSelectedDays(prev => 
                              prev.includes(day.value)
                                ? prev.filter(d => d !== day.value)
                                : [...prev, day.value]
                            );
                          }}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Time and Capacity (shared) */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick presets</Label>
                <div className="flex flex-wrap gap-2">
                  {TIME_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      const hour = parseInt(newTime.split(':')[0], 10);
                      let suggestedPeriod = mealPeriod;
                      if (hour >= 6 && hour < 11) suggestedPeriod = 'BREAKFAST';
                      else if (hour >= 11 && hour < 15) suggestedPeriod = 'LUNCH';
                      else if (hour >= 17 && hour < 23) suggestedPeriod = 'DINNER';
                      setStartTime(newTime);
                      setMealPeriod(suggestedPeriod);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              {endTime <= startTime && (
                <p className="text-xs text-destructive">End time must be after start time</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meal Period *</Label>
                  <Select value={mealPeriod} onValueChange={(v) => setMealPeriod(v as MealPeriod)}>
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
                    value={capacity}
                    onChange={(value) => setCapacity(value)}
                    defaultValue={1}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Customize */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Review and Customize
            </CardTitle>
            <CardDescription>
              Review the time slots that will be created. You can adjust times or exclude specific dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{selectedRestaurant?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {scheduleType === 'single' ? 'Single slot' : `Recurring: ${frequency === 'daily' ? 'Every day' : 'Selected days'}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="secondary">{includedCount} will be created</Badge>
              </div>
            </div>

            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">
                  {duplicateCount} slot{duplicateCount !== 1 ? 's already exist' : ' already exists'} and will be skipped. 
                  Change the start time to create a different slot.
                </p>
              </div>
            )}

            {previewSlots.length > 10 && (
              <p className="text-sm text-muted-foreground">
                Showing up to 90 days. Future slots can be auto-generated by the recurring rule.
              </p>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-10"></th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Day</th>
                      <th className="p-2 text-left">Start</th>
                      <th className="p-2 text-left">End</th>
                      <th className="p-2 text-left">Capacity</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSlots.map((slot, index) => (
                      <tr 
                        key={`${slot.date}-${index}`} 
                        className={`border-t ${
                          slot.isClosed ? 'opacity-50 bg-muted/30' : 
                          slot.isDuplicate ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={slot.included}
                            onCheckedChange={() => toggleSlotIncluded(index)}
                            disabled={slot.isClosed || slot.isDuplicate}
                          />
                        </td>
                        <td className="p-2 font-medium">{format(parseISO(slot.date), 'MMM d, yyyy')}</td>
                        <td className="p-2 text-muted-foreground">{slot.weekday}</td>
                        <td className="p-2">
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateSlotField(index, 'startTime', e.target.value)}
                            disabled={slot.isClosed}
                            className={`h-8 w-24 ${slot.isDuplicate ? 'border-amber-400' : ''}`}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateSlotField(index, 'endTime', e.target.value)}
                            disabled={slot.isClosed || slot.isDuplicate || !slot.included}
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="p-2">
                          <NumericInput
                            min={1}
                            value={slot.capacity}
                            onChange={(value) => updateSlotField(index, 'capacity', value)}
                            disabled={slot.isClosed || slot.isDuplicate || !slot.included}
                            defaultValue={1}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="p-2">
                          {slot.isClosed ? (
                            <Badge variant="destructive" className="text-xs">Closed</Badge>
                          ) : slot.isDuplicate ? (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Already exists</Badge>
                          ) : slot.included ? (
                            <Badge variant="default" className="text-xs">Will create</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Excluded</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {includedCount === 0 && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">No slots selected. Please include at least one slot to create.</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={() => setConfirmDialogOpen(true)} 
                disabled={creating || includedCount === 0}
              >
                {creating ? 'Creating...' : `Create ${includedCount} Slot${includedCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Slot Creation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to create the following time slots:</p>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Restaurant</span>
                    <span className="font-medium">{selectedRestaurant?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Slots to create</span>
                    <span className="font-medium">{includedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meal period</span>
                    <span className="font-medium">{mealPeriod}</span>
                  </div>
                  {scheduleType === 'recurring' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date range</span>
                        <span className="font-medium">
                          {format(parseISO(startDate), 'MMM d')} – {format(parseISO(endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{startTime} – {endTime}</span>
                      </div>
                    </>
                  )}
                  {scheduleType === 'single' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{format(parseISO(singleDate), 'EEE, MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{startTime} – {endTime}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity per slot</span>
                    <span className="font-medium">{capacity} covers</span>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Duplicates (will be skipped)</span>
                      <span className="font-medium">{duplicateCount}</span>
                    </div>
                  )}
                </div>
                {scheduleType === 'recurring' && (
                  <p className="text-xs text-muted-foreground">
                    A recurring schedule rule will also be created for future reference.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Slots'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
