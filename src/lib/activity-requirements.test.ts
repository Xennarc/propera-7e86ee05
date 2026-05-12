import { describe, expect, it } from 'vitest';
import { parseActivityRequirements, ActivityRequirements } from './activity-requirements';

describe('parseActivityRequirements', () => {
  const DEFAULTS: ActivityRequirements = {
    requires_waiver: true,
    requires_medical: false,
    requires_gear: true,
    requires_cert: false,
    requires_cert_verification: false,
    requires_medical_clearance: false,
    requires_pickup: false,
  };

  it('should return default requirements when no category or JSON is provided', () => {
    const result = parseActivityRequirements(null);
    expect(result).toEqual(DEFAULTS);
  });

  describe('category overrides', () => {
    it('should apply DIVE overrides', () => {
      const result = parseActivityRequirements(null, 'DIVE');
      expect(result).toEqual({
        ...DEFAULTS,
        requires_cert: true,
        requires_medical: true,
        requires_cert_verification: true,
        requires_medical_clearance: true,
        requires_pickup: true,
      });
    });

    it('should apply WATERSPORT overrides', () => {
      const result = parseActivityRequirements(null, 'WATERSPORT');
      expect(result).toEqual({
        ...DEFAULTS,
        requires_medical: true,
        requires_pickup: true,
      });
    });

    it('should apply EXCURSION overrides', () => {
      const result = parseActivityRequirements(null, 'EXCURSION');
      expect(result).toEqual({
        ...DEFAULTS,
        requires_pickup: true,
      });
    });

    it('should fall back to defaults for unknown categories', () => {
      const result = parseActivityRequirements(null, 'UNKNOWN_CATEGORY');
      expect(result).toEqual(DEFAULTS);
    });
  });

  describe('explicit JSON overrides', () => {
    it('should override defaults with explicit JSON requirements', () => {
      const requirementsJson = {
        requires_waiver: false,
        requires_medical: true,
      };
      const result = parseActivityRequirements(requirementsJson);
      expect(result).toEqual({
        ...DEFAULTS,
        requires_waiver: false,
        requires_medical: true,
      });
    });

    it('should override category defaults with explicit JSON requirements', () => {
      // DIVE defaults to requires_pickup: true. Let's explicitly set it to false.
      const requirementsJson = {
        requires_pickup: false,
        requires_cert: false,
      };
      const result = parseActivityRequirements(requirementsJson, 'DIVE');
      expect(result).toEqual({
        ...DEFAULTS,
        requires_medical: true, // from DIVE override
        requires_cert_verification: true, // from DIVE override
        requires_medical_clearance: true, // from DIVE override
        requires_pickup: false, // overridden by JSON
        requires_cert: false, // overridden by JSON
      });
    });

    it('should ignore non-boolean fields in JSON', () => {
      const requirementsJson = {
        requires_waiver: 'yes', // invalid type
        requires_medical: null, // invalid type
        requires_pickup: 1, // invalid type
        some_other_field: true, // unknown field
      };
      const result = parseActivityRequirements(requirementsJson);
      expect(result).toEqual(DEFAULTS);
    });

    it('should ignore non-object requirementsJson', () => {
      expect(parseActivityRequirements('not-an-object')).toEqual(DEFAULTS);
      expect(parseActivityRequirements(123)).toEqual(DEFAULTS);
      expect(parseActivityRequirements(true)).toEqual(DEFAULTS);
    });
  });
});
