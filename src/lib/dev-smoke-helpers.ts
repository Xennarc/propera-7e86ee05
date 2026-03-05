/**
 * Dev-only smoke test helpers.
 * Exposed on window.__propera_smoke in development builds.
 *
 * Usage (browser console):
 *   window.__propera_smoke.deptScope()
 *   window.__propera_smoke.opsEvents()
 */

import { supabase } from '@/integrations/supabase/client';

interface SmokeHelpers {
  deptScope: () => Promise<void>;
  opsEvents: () => Promise<void>;
}

async function deptScope() {
  console.group('[Smoke] Department Scope');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('Not authenticated'); console.groupEnd(); return; }

    const { data: memberships } = await supabase
      .from('department_memberships')
      .select('*, department:resort_departments(*)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!memberships?.length) {
      console.warn('No active department memberships found.');
      console.groupEnd();
      return;
    }

    for (const m of memberships) {
      const dept = m.department as any;
      const scopeKey = dept?.activity_scope_key ?? null;
      console.log(`Dept: ${dept?.name ?? 'unknown'} (key=${dept?.key})`, {
        department_id: dept?.id,
        resort_id: dept?.resort_id,
        activity_scope_key: scopeKey,
        membership_role: m.dept_role,
      });
    }
  } catch (e) {
    console.error('Smoke deptScope failed:', e);
  }
  console.groupEnd();
}

async function opsEvents() {
  console.group('[Smoke] Ops Events (today)');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.warn('Not authenticated'); console.groupEnd(); return; }

    // Get first membership to determine resort
    const { data: memberships } = await supabase
      .from('department_memberships')
      .select('resort_id, department:resort_departments(key, activity_scope_key)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const mem = memberships?.[0];
    if (!mem) { console.warn('No memberships'); console.groupEnd(); return; }

    const dept = mem.department as any;
    const scope = dept?.activity_scope_key;
    const resortId = mem.resort_id;

    console.log(`Fetching sessions for resort=${resortId}, date=${today}, scope=${scope ?? 'ALL'}`);

    let query = supabase
      .from('activity_sessions')
      .select('id, date, start_time, end_time, status, capacity, activity:activities!inner(name, category)')
      .eq('resort_id', resortId)
      .eq('date', today);

    if (scope) {
      query = query.eq('activity.category', scope);
    }

    const { data, error } = await query.order('start_time').limit(20);
    if (error) { console.error('Query error:', error.message); console.groupEnd(); return; }

    console.table(data?.map(s => ({
      id: s.id.slice(0, 8),
      activity: (s.activity as any)?.name,
      category: (s.activity as any)?.category,
      time: `${s.start_time}-${s.end_time}`,
      status: s.status,
      capacity: s.capacity,
    })));
    console.log(`Total: ${data?.length ?? 0} sessions`);
  } catch (e) {
    console.error('Smoke opsEvents failed:', e);
  }
  console.groupEnd();
}

export function installSmokeHelpers() {
  if (!import.meta.env.DEV) return;

  const helpers: SmokeHelpers = { deptScope, opsEvents };
  (window as any).__propera_smoke = helpers;
  console.log('[Dev] Smoke helpers installed → window.__propera_smoke.deptScope() / .opsEvents()');
}
