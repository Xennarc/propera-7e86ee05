import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function measureBaseline() {
  const today = new Date().toISOString().split('T')[0];

  // Dummy active resorts
  const { data: resorts } = await supabase.from('resorts').select('id, status');
  const activeResorts = resorts?.filter(r => r.status === 'ACTIVE') || [];

  if (activeResorts.length === 0) {
    console.log("No active resorts to test.");
    return;
  }

  const start = performance.now();

  const alerts: { type: 'warning' | 'info'; message: string; count: number }[] = [];

  // OLD CODE
  // Check resorts without time slots
  for (const resort of activeResorts) {
    const { count: slotCount } = await supabase
      .from('restaurant_time_slots')
      .select('*', { count: 'exact', head: true })
      .eq('resort_id', resort.id)
      .gte('date', today);

    if (slotCount === 0) {
      const existing = alerts.find(a => a.message.includes('no upcoming time slots'));
      if (existing) {
        existing.count++;
      } else {
        alerts.push({ type: 'warning', message: 'resorts have no upcoming time slots configured', count: 1 });
      }
    }
  }

  // Check resorts without activity sessions
  for (const resort of activeResorts) {
    const { count: sessionCount } = await supabase
      .from('activity_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('resort_id', resort.id)
      .gte('date', today);

    if (sessionCount === 0) {
      const existing = alerts.find(a => a.message.includes('no upcoming activity sessions'));
      if (existing) {
        existing.count++;
      } else {
        alerts.push({ type: 'warning', message: 'resorts have no upcoming activity sessions', count: 1 });
      }
    }
  }

  const end = performance.now();
  console.log(`Baseline Execution Time: ${(end - start).toFixed(2)} ms`);
  console.log(`Alerts:`, alerts);
}

measureBaseline();
