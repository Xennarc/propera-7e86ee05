/**
 * DepartmentScopeResolver — Single canonical resolver for "what this department owns"
 *
 * Priority:
 *   A) If dept_scope_v2_enabled flag is on → read department_bindings (active)
 *   B) Else → fallback to legacy LEGACY_CATEGORY_MAP
 *
 * Always returns arrays (never null). Adds warnings when scope is empty.
 */

import type { ResortDepartment, DepartmentBinding } from '@/types/database';

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  dive: 'DIVE',
  watersports: 'WATERSPORT',
  excursions: 'EXCURSION',
  spa: 'SPA',
  other: 'OTHER',
};

export interface DepartmentScope {
  /** Activity category keys this department owns (e.g. ['DIVE']) */
  activityCategoryKeys: string[];
  /** Restaurant IDs this department owns */
  restaurantIds: string[];
  /** Warnings for missing or empty scope */
  warnings: string[];
  /** Whether scope was resolved from v2 bindings or legacy fallback */
  source: 'bindings_v2' | 'legacy_fallback';
}

export interface ResolveScopeInput {
  department: ResortDepartment | null | undefined;
  bindings: DepartmentBinding[];
  v2Enabled: boolean;
}

export function resolveDepartmentScope(input: ResolveScopeInput): DepartmentScope {
  const { department, bindings, v2Enabled } = input;

  const result: DepartmentScope = {
    activityCategoryKeys: [],
    restaurantIds: [],
    warnings: [],
    source: v2Enabled ? 'bindings_v2' : 'legacy_fallback',
  };

  if (!department) {
    return result;
  }

  if (v2Enabled) {
    // ── Path A: v2 bindings ──
    const deptBindings = bindings.filter(
      b => b.department_id === department.id && b.is_active
    );

    for (const b of deptBindings) {
      if (b.binding_type === 'activity_category') {
        result.activityCategoryKeys.push(b.binding_key);
      } else if (b.binding_type === 'restaurant') {
        result.restaurantIds.push(b.binding_key);
      }
    }
  } else {
    // ── Path B: legacy fallback ──
    // First try the DB-stored activity_scope_key
    const dbScope = department.activity_scope_key;
    if (dbScope) {
      result.activityCategoryKeys.push(dbScope);
    } else {
      // Fall back to hardcoded map
      const legacyKey = LEGACY_CATEGORY_MAP[department.key.toLowerCase()];
      if (legacyKey) {
        result.activityCategoryKeys.push(legacyKey);
      }
    }
  }

  // Warn if completely empty
  if (
    result.activityCategoryKeys.length === 0 &&
    result.restaurantIds.length === 0
  ) {
    result.warnings.push(
      `Department "${department.name}" (key=${department.key}) has no configured scope. ` +
      `Sessions will be shown unfiltered. Configure scope in department settings.`
    );

    if (import.meta.env.DEV) {
      console.warn(
        `[DeptScopeResolver] Empty scope for dept="${department.key}" id=${department.id} ` +
        `source=${result.source}`
      );
    }
  }

  return result;
}

/**
 * Convenience: returns the first activity category key or null.
 * Used by pages that filter by a single category (Planner, Inbox, Master Sheet).
 */
export function getScopePrimaryCategory(scope: DepartmentScope): string | null {
  return scope.activityCategoryKeys[0] ?? null;
}
