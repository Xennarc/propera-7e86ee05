/**
 * Maps department_key (from resort_departments table) to the
 * OpsDepartment enum used by the get_daily_ops_sheet RPC.
 */
import type { OpsDepartment } from '@/hooks/useDailyOpsSheet';
import type { ResortDepartment } from '@/types/database';

const DEPT_KEY_TO_OPS: Record<string, OpsDepartment> = {
  dive: 'DIVE',
  watersports: 'WATERSPORT',
  excursions: 'EXCURSION',
  spa: 'SPA',
  other: 'OTHER',
};

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  dive: 'DIVE',
  watersports: 'WATERSPORT',
  excursions: 'EXCURSION',
  spa: 'SPA',
  other: 'OTHER',
};

/** @deprecated Use getDepartmentActivityScope instead */
export function deptKeyToOps(deptKey: string | undefined): OpsDepartment {
  if (!deptKey) return null;
  return DEPT_KEY_TO_OPS[deptKey.toLowerCase()] ?? null;
}

/** @deprecated Use getDepartmentActivityScope instead */
export function deptKeyToCategory(deptKey: string | undefined): string | null {
  if (!deptKey) return null;
  return LEGACY_CATEGORY_MAP[deptKey.toLowerCase()] ?? null;
}

/**
 * Data-driven activity scope resolver.
 * Prefers DB-stored activity_scope_key, falls back to legacy hardcoded map.
 * Returns null if truly unscoped.
 */
export function getDepartmentActivityScope(dept: ResortDepartment | null | undefined): string | null {
  if (!dept) return null;
  if (dept.activity_scope_key) return dept.activity_scope_key;
  return LEGACY_CATEGORY_MAP[dept.key.toLowerCase()] ?? null;
}

/**
 * Same as getDepartmentActivityScope but cast to OpsDepartment for the RPC.
 */
export function getDepartmentOpsScope(dept: ResortDepartment | null | undefined): OpsDepartment {
  const scope = getDepartmentActivityScope(dept);
  if (!scope) return null;
  return scope as OpsDepartment;
}

/**
 * Returns true if the department has no configured scope and its key
 * is not in the legacy map — meaning sessions cannot be filtered.
 */
export function isDepartmentUnscoped(dept: ResortDepartment | null | undefined): boolean {
  if (!dept) return false;
  return getDepartmentActivityScope(dept) === null;
}
