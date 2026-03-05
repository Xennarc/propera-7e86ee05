/**
 * Maps department_key (from resort_departments table) to the
 * OpsDepartment enum used by the get_daily_ops_sheet RPC.
 */
import type { OpsDepartment } from '@/hooks/useDailyOpsSheet';
import type { ResortDepartment } from '@/types/database';

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  dive: 'DIVE',
  watersports: 'WATERSPORT',
  excursions: 'EXCURSION',
  spa: 'SPA',
  other: 'OTHER',
};

/**
 * Data-driven activity scope resolver.
 * Prefers DB-stored activity_scope_key, falls back to legacy hardcoded map.
 * Returns null if truly unscoped.
 */
export function getDepartmentActivityScope(dept: ResortDepartment | null | undefined): string | null {
  if (!dept) return null;
  const scope = dept.activity_scope_key ?? LEGACY_CATEGORY_MAP[dept.key.toLowerCase()] ?? null;

  if (!scope && import.meta.env.DEV) {
    console.warn(
      `[DeptScope] Resolved to NULL for deptKey="${dept.key}" (id=${dept.id}). ` +
      `This department has no activity_scope_key and no legacy mapping.`
    );
  }

  return scope;
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
