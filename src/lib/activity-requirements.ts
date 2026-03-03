/**
 * Parse activity requirements_json with safe defaults.
 * Default: waiver=true, gear=true, cert=false, medical=false
 *
 * Departure gate fields:
 *   requires_cert_verification – block depart if cert not verified
 *   requires_medical_clearance – block depart if medical review pending/followup
 */
export interface ActivityRequirements {
  requires_waiver: boolean;
  requires_medical: boolean;
  requires_gear: boolean;
  requires_cert: boolean;
  /** Departure gate: must all certs be verified before departing? */
  requires_cert_verification: boolean;
  /** Departure gate: must medical reviews be cleared before departing? */
  requires_medical_clearance: boolean;
}

const DEFAULTS: ActivityRequirements = {
  requires_waiver: true,
  requires_medical: false,
  requires_gear: true,
  requires_cert: false,
  requires_cert_verification: false,
  requires_medical_clearance: false,
};

/** Category-based overrides when requirements_json is null */
const CATEGORY_OVERRIDES: Record<string, Partial<ActivityRequirements>> = {
  DIVE: { requires_cert: true, requires_medical: true, requires_cert_verification: true, requires_medical_clearance: true },
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
    if (typeof r.requires_cert_verification === 'boolean') base.requires_cert_verification = r.requires_cert_verification;
    if (typeof r.requires_medical_clearance === 'boolean') base.requires_medical_clearance = r.requires_medical_clearance;
  }

  return base;
}
