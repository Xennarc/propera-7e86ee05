// Pricing charge configuration type
export interface PricingCharge {
  name: string;
  percentage: number;
  apply_after_previous: boolean;
  is_active: boolean;
}

export interface PriceBreakdown {
  subtotal: number;
  charges: Array<{
    name: string;
    percentage: number;
    amount: number;
  }>;
  total: number;
}

// Default charges if none configured
export const DEFAULT_PRICING_CHARGES: PricingCharge[] = [
  { name: 'Service Charge', percentage: 10, apply_after_previous: false, is_active: true },
  { name: 'Government Tax', percentage: 17, apply_after_previous: true, is_active: true },
];

/**
 * Calculate price breakdown with taxes and charges
 * @param baseAmount - The base price (price_per_person * num_guests)
 * @param charges - Array of pricing charges from resort config
 * @returns PriceBreakdown with subtotal, individual charges, and total
 */
export function calculatePriceBreakdown(
  baseAmount: number,
  charges: PricingCharge[] = DEFAULT_PRICING_CHARGES
): PriceBreakdown {
  const activeCharges = charges.filter(c => c.is_active);
  
  let runningTotal = baseAmount;
  const chargeBreakdown: PriceBreakdown['charges'] = [];
  
  for (const charge of activeCharges) {
    // Calculate base for this charge
    const chargeBase = charge.apply_after_previous ? runningTotal : baseAmount;
    const chargeAmount = chargeBase * (charge.percentage / 100);
    
    chargeBreakdown.push({
      name: charge.name,
      percentage: charge.percentage,
      amount: chargeAmount,
    });
    
    runningTotal += chargeAmount;
  }
  
  return {
    subtotal: baseAmount,
    charges: chargeBreakdown,
    total: runningTotal,
  };
}

/**
 * Parse pricing charges from JSONB stored in database
 */
export function parsePricingCharges(jsonb: unknown): PricingCharge[] {
  if (!jsonb || !Array.isArray(jsonb)) {
    return DEFAULT_PRICING_CHARGES;
  }
  
  return jsonb.map((item: any) => ({
    name: item.name || 'Charge',
    percentage: typeof item.percentage === 'number' ? item.percentage : 0,
    apply_after_previous: !!item.apply_after_previous,
    is_active: item.is_active !== false,
  }));
}
