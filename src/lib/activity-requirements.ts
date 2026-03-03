/**
 * Parse activity requirements_json with safe defaults.
 * Default: waiver=true, gear=true, cert=false, medical=false
 */
export interface ActivityRequirements {
  requires_waiver: boolean;
  requires_medical: boolean;
  requires_gear: boolean;
  requires_cert: boolean;
}

const DEFAULTS: ActivityRequirements = {
  requires_waiver: true,
  requires_medical: false,
  requires_gear: true,
  requires_cert: false,
};

/** Category-based overrides when requirements_json is null */
const CATEGORY_OVERRIDES: Record<string, Partial<ActivityRequirements>> = {
  DIVE: { requires_cert: true, requires_medical: true },
  WATERSPORT: { requires_medical: true },
};

export function parseActivityRequirements(
  requirementsJson: unknown,
  category?: string | null,
): ActivityRequirements {
  const base = { ...DEFAULTS };

  // Apply category overrides first
  if (category && CATEGORY_OVERRIDES[category]) {
    Object.assign(base, CATEGORY_OVERRIDES[category]);
  }

  // Override with explicit requirements if set
  if (requirementsJson && typeof requirementsJson === 'object') {
    const r = requirementsJson as Record<string, unknown>;
    if (typeof r.requires_waiver === 'boolean') base.requires_waiver = r.requires_waiver;
    if (typeof r.requires_medical === 'boolean') base.requires_medical = r.requires_medical;
    if (typeof r.requires_gear === 'boolean') base.requires_gear = r.requires_gear;
    if (typeof r.requires_cert === 'boolean') base.requires_cert = r.requires_cert;
  }

  return base;
}
