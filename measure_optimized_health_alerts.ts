import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function measureOptimized() {
  const today = new Date().toISOString().split('T')[0];

  const { data: resorts } = await supabase.from('resorts').select('id, status');
  const activeResorts = resorts?.filter(r => r.status === 'ACTIVE') || [];

  if (activeResorts.length === 0) {
    console.log("No active resorts to test.");
    return;
  }
  const activeResortIds = activeResorts.map(r => r.id);

  const start = performance.now();

  const alerts: { type: 'warning' | 'info'; message: string; count: number }[] = [];

  // OPTIMIZED CODE

  // 1. Fetch slots for all active resorts
  const { data: slots } = await supabase
    .from('restaurant_time_slots')
    .select('resort_id')
    .in('resort_id', activeResortIds)
    .gte('date', today);

  const resortsWithSlots = new Set((slots || []).map(s => s.resort_id));
  const missingSlotsCount = activeResorts.length - resortsWithSlots.size;

  if (missingSlotsCount > 0) {
    alerts.push({
      type: 'warning',
      message: 'resorts have no upcoming time slots configured',
      count: missingSlotsCount
    });
  }

  // 2. Fetch sessions for all active resorts
  const { data: sessions } = await supabase
    .from('activity_sessions')
    .select('resort_id')
    .in('resort_id', activeResortIds)
    .gte('date', today);

  const resortsWithSessions = new Set((sessions || []).map(s => s.resort_id));
  const missingSessionsCount = activeResorts.length - resortsWithSessions.size;

  if (missingSessionsCount > 0) {
    alerts.push({
      type: 'warning',
      message: 'resorts have no upcoming activity sessions',
      count: missingSessionsCount
    });
  }

  const end = performance.now();
  console.log(`Optimized Execution Time: ${(end - start).toFixed(2)} ms`);
  console.log(`Alerts:`, alerts);
}

measureOptimized();
