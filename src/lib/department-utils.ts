/**
 * Maps department_key (from resort_departments table) to the
 * OpsDepartment enum used by the get_daily_ops_sheet RPC.
 */
import type { OpsDepartment } from '@/hooks/useDailyOpsSheet';

const DEPT_KEY_TO_OPS: Record<string, OpsDepartment> = {
  dive: 'DIVE',
  watersports: 'WATERSPORT',
  excursions: 'EXCURSION',
  spa: 'SPA',
  other: 'OTHER',
};

export function deptKeyToOps(deptKey: string | undefined): OpsDepartment {
  if (!deptKey) return null;
  return DEPT_KEY_TO_OPS[deptKey.toLowerCase()] ?? null;
}

/** Map department_key to the activity category for direct session queries */
export function deptKeyToCategory(deptKey: string | undefined): string | null {
  const map: Record<string, string> = {
    dive: 'DIVE',
    watersports: 'WATERSPORT',
    excursions: 'EXCURSION',
    spa: 'SPA',
    other: 'OTHER',
  };
  if (!deptKey) return null;
  return map[deptKey.toLowerCase()] ?? null;
}
