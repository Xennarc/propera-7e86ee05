/**
 * coverageRules – Compute coverage status for a session based on
 * activity ops_rules_json, assigned staff/assets, and booking count.
 *
 * ops_rules_json shape:
 * {
 *   min_roles?: { instructor?: number, guide?: number, captain?: number, crew?: number },
 *   max_pax_per_role?: { instructor?: number, guide?: number },
 *   requires_boat?: boolean,
 * }
 */

export type CoverageStatus = 'green' | 'amber' | 'red';

export interface CoverageResult {
  status: CoverageStatus;
  details: string[];
}

interface OpsRules {
  min_roles?: Record<string, number>;
  max_pax_per_role?: Record<string, number>;
  requires_boat?: boolean;
}

/**
 * Category-based default ops rules applied when ops_rules_json is null.
 * These provide sane coverage signals out of the box.
 */
const CATEGORY_DEFAULTS: Record<string, OpsRules> = {
  DIVE: { min_roles: { instructor: 1 }, max_pax_per_role: { instructor: 4 }, requires_boat: true },
  WATERSPORT: { min_roles: { guide: 1 }, max_pax_per_role: { guide: 8 } },
  EXCURSION: { min_roles: { guide: 1 }, max_pax_per_role: { guide: 10 } },
};

interface CoverageInput {
  opsRules: unknown;
  assignedRoles: Record<string, number>; // e.g. { instructor: 2, captain: 1 }
  assignedBoats: number;
  bookedCount: number;
  /** Activity category – used for defaults when opsRules is null */
  category?: string | null;
  /** Number of resource conflicts (boats/staff/equipment) – escalates to red */
  conflictCount?: number;
}

function parseRules(raw: unknown): OpsRules | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as OpsRules;
}

export function computeCoverage(input: CoverageInput): CoverageResult {
  // Use explicit rules, fall back to category defaults
  const rules = parseRules(input.opsRules)
    ?? (input.category ? CATEGORY_DEFAULTS[input.category] ?? null : null);

  if (!rules && !input.conflictCount) {
    return { status: 'green', details: [] };
  }

  const details: string[] = [];
  let worstStatus: CoverageStatus = 'green';

  const escalate = (s: CoverageStatus) => {
    if (s === 'red') worstStatus = 'red';
    else if (s === 'amber' && worstStatus !== 'red') worstStatus = 'amber';
  };

  // 1) Min role checks
  if (rules.min_roles) {
    for (const [role, minCount] of Object.entries(rules.min_roles)) {
      const assigned = input.assignedRoles[role] ?? 0;
      if (assigned < minCount) {
        const missing = minCount - assigned;
        details.push(`Missing: ${missing} ${role}${missing > 1 ? 's' : ''}`);
        if (assigned === 0) escalate('red');
        else escalate('amber');
      }
    }
  }

  // 2) Pax ratio checks
  if (rules.max_pax_per_role && input.bookedCount > 0) {
    for (const [role, maxPax] of Object.entries(rules.max_pax_per_role)) {
      const assigned = input.assignedRoles[role] ?? 0;
      if (assigned === 0) {
        // Already caught by min_roles if configured; skip ratio message
        continue;
      }
      const ratio = input.bookedCount / assigned;
      if (ratio > maxPax) {
        details.push(
          `Ratio breach: ${input.bookedCount} pax / ${assigned} ${role} (max ${maxPax})`
        );
        escalate('amber');
      }
    }
  }

  // 3) Boat requirement
  if (rules.requires_boat && input.assignedBoats === 0) {
    details.push('No boat assigned');
    escalate('red');
  }

  return { status: worstStatus, details };
}
