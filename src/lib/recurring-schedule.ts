import { supabase } from '@/integrations/supabase/client';
import { addDays, format, parseISO, getDay, isBefore, isAfter, min } from 'date-fns';
import { ActivityRecurringRule, RestaurantRecurringRule } from '@/types/database';

const GENERATION_HORIZON_DAYS = 90;

// Fetch closure dates for an activity
async function getActivityClosureDates(activityId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('activity_closures')
    .select('closure_date')
    .eq('activity_id', activityId)
    .gte('closure_date', format(new Date(), 'yyyy-MM-dd'));
  
  return new Set(data?.map(c => c.closure_date) || []);
}

// Fetch closure dates for a restaurant
async function getRestaurantClosureDates(restaurantId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('restaurant_closures')
    .select('closure_date')
    .eq('restaurant_id', restaurantId)
    .gte('closure_date', format(new Date(), 'yyyy-MM-dd'));
  
  return new Set(data?.map(c => c.closure_date) || []);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return 'Every day';
  return days.sort((a, b) => a - b).map(d => DAY_NAMES[d]).join(', ');
}

export function formatRuleSummary(
  frequency: string,
  daysOfWeek: number[],
  startTime: string,
  startDate: string,
  endDate: string,
  capacity: number
): string {
  const daysText = frequency === 'DAILY' ? 'Every day' : formatDaysOfWeek(daysOfWeek);
  const timeText = startTime.slice(0, 5);
  const dateRange = `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d')}`;
  return `${daysText} at ${timeText} (${capacity} pax) • ${dateRange}`;
}

function getDatesInRange(
  startDate: Date,
  endDate: Date,
  frequency: string,
  daysOfWeek: number[]
): Date[] {
  const dates: Date[] = [];
  const horizon = addDays(new Date(), GENERATION_HORIZON_DAYS);
  const effectiveEnd = min([endDate, horizon]);
  
  let current = startDate;
  while (!isAfter(current, effectiveEnd)) {
    const dayOfWeek = getDay(current);
    
    if (frequency === 'DAILY' || daysOfWeek.includes(dayOfWeek)) {
      // Only include future dates (today onwards)
      if (!isBefore(current, new Date(format(new Date(), 'yyyy-MM-dd')))) {
        dates.push(current);
      }
    }
    current = addDays(current, 1);
  }
  
  return dates;
}

export async function generateActivitySessions(rule: ActivityRecurringRule): Promise<{ created: number; skipped: number }> {
  const dates = getDatesInRange(
    parseISO(rule.start_date),
    parseISO(rule.end_date),
    rule.frequency,
    rule.days_of_week
  );

  // Fetch closure dates to skip
  const closureDates = await getActivityClosureDates(rule.activity_id);

  // Fetch existing sessions to avoid duplicates
  const { data: existingSessions } = await supabase
    .from('activity_sessions')
    .select('date, start_time')
    .eq('activity_id', rule.activity_id)
    .in('date', dates.map(d => format(d, 'yyyy-MM-dd')));

  const existingSet = new Set(
    existingSessions?.map(s => `${s.date}_${s.start_time.slice(0, 5)}`) || []
  );

  const sessionsToCreate = dates
    .filter(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      // Skip if date is a closure date or already exists
      return !closureDates.has(dateStr) && !existingSet.has(`${dateStr}_${rule.start_time.slice(0, 5)}`);
    })
    .map(d => ({
      resort_id: rule.resort_id,
      activity_id: rule.activity_id,
      date: format(d, 'yyyy-MM-dd'),
      start_time: rule.start_time,
      end_time: rule.end_time,
      capacity: rule.capacity,
      status: 'SCHEDULED' as const,
    }));

  if (sessionsToCreate.length === 0) {
    return { created: 0, skipped: dates.length };
  }

  const { error } = await supabase
    .from('activity_sessions')
    .insert(sessionsToCreate);

  if (error) throw error;

  return { created: sessionsToCreate.length, skipped: dates.length - sessionsToCreate.length };
}

export async function generateRestaurantSlots(rule: RestaurantRecurringRule): Promise<{ created: number; skipped: number }> {
  const dates = getDatesInRange(
    parseISO(rule.start_date),
    parseISO(rule.end_date),
    rule.frequency,
    rule.days_of_week
  );

  // Fetch closure dates to skip
  const closureDates = await getRestaurantClosureDates(rule.restaurant_id);

  // Fetch existing slots to avoid duplicates
  const { data: existingSlots } = await supabase
    .from('restaurant_time_slots')
    .select('date, start_time')
    .eq('restaurant_id', rule.restaurant_id)
    .in('date', dates.map(d => format(d, 'yyyy-MM-dd')));

  const existingSet = new Set(
    existingSlots?.map(s => `${s.date}_${s.start_time.slice(0, 5)}`) || []
  );

  const slotsToCreate = dates
    .filter(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      // Skip if date is a closure date or already exists
      return !closureDates.has(dateStr) && !existingSet.has(`${dateStr}_${rule.start_time.slice(0, 5)}`);
    })
    .map(d => ({
      resort_id: rule.resort_id,
      restaurant_id: rule.restaurant_id,
      date: format(d, 'yyyy-MM-dd'),
      start_time: rule.start_time,
      end_time: rule.end_time,
      capacity: rule.capacity,
      meal_period: rule.meal_period,
      status: 'OPEN' as const,
    }));

  if (slotsToCreate.length === 0) {
    return { created: 0, skipped: dates.length };
  }

  const { error } = await supabase
    .from('restaurant_time_slots')
    .insert(slotsToCreate);

  if (error) throw error;

  return { created: slotsToCreate.length, skipped: dates.length - slotsToCreate.length };
}
