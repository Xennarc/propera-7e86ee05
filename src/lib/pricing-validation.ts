import { z } from 'zod';

// ==========================================
// Valid Tiers
// ==========================================

export const VALID_TIERS = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'] as const;
export type ValidTier = typeof VALID_TIERS[number];

export const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'] as const;
export type ValidCurrency = typeof VALID_CURRENCIES[number];

// ==========================================
// Validation Schemas
// ==========================================

export const planPricingUpdateSchema = z.object({
  id: z.string().uuid('Invalid plan ID'),
  monthly_price_cents: z
    .number()
    .int('Price must be a whole number')
    .min(0, 'Price cannot be negative')
    .max(100000000, 'Price exceeds maximum allowed'),
  currency: z.enum(VALID_CURRENCIES, {
    errorMap: () => ({ message: `Currency must be one of: ${VALID_CURRENCIES.join(', ')}` }),
  }),
  is_active: z.boolean(),
});

export const addonPricingUpdateSchema = z.object({
  id: z.string().uuid('Invalid addon ID'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  monthly_price_cents: z
    .number()
    .int('Price must be a whole number')
    .min(0, 'Price cannot be negative')
    .max(100000000, 'Price exceeds maximum allowed'),
  currency: z.enum(VALID_CURRENCIES, {
    errorMap: () => ({ message: `Currency must be one of: ${VALID_CURRENCIES.join(', ')}` }),
  }),
  is_active: z.boolean(),
});

export const tierValidationSchema = z.enum(VALID_TIERS, {
  errorMap: () => ({ message: `Tier must be one of: ${VALID_TIERS.join(', ')}` }),
});

// ==========================================
// Validation Helpers
// ==========================================

export function validatePlanPricingUpdate(data: unknown) {
  return planPricingUpdateSchema.safeParse(data);
}

export function validateAddonPricingUpdate(data: unknown) {
  return addonPricingUpdateSchema.safeParse(data);
}

export function isValidTier(tier: string): tier is ValidTier {
  return VALID_TIERS.includes(tier as ValidTier);
}

export function isValidCurrency(currency: string): currency is ValidCurrency {
  return VALID_CURRENCIES.includes(currency as ValidCurrency);
}

// ==========================================
// Error Formatting
// ==========================================

export function formatValidationErrors(errors: z.ZodError): string {
  return errors.issues.map((issue) => issue.message).join(', ');
}
