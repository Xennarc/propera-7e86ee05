import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export type ResortSize = 'small' | 'mid' | 'large';

export const RESORT_SIZE_OPTIONS: { value: ResortSize; label: string }[] = [
  { value: 'small', label: '≤ 50 rooms' },
  { value: 'mid', label: '51–150 rooms' },
  { value: 'large', label: '151–300 rooms' },
];

const VALID_SIZES = new Set<string>(['small', 'mid', 'large']);

export function useResortSize(): [ResortSize, (size: ResortSize) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('size') ?? 'mid';
  const size: ResortSize = VALID_SIZES.has(raw) ? (raw as ResortSize) : 'mid';

  const setSize = useCallback(
    (next: ResortSize) => {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set('size', next);
        return updated;
      }, { replace: true });
    },
    [setSearchParams],
  );

  return [size, setSize];
}

// ==========================================
// Price + usage lookup by plan × band
// ==========================================

export interface BandPricing {
  price: string;
  usage: string;
  overage: string;
}

const BAND_PRICING: Record<string, Record<ResortSize, BandPricing>> = {
  essential: {
    small:  { price: '$249',   usage: 'Up to 500 guest stays / month',   overage: 'Overage: $0.15 per guest stay' },
    mid:    { price: '$449',   usage: 'Up to 1,500 guest stays / month', overage: 'Overage: $0.15 per guest stay' },
    large:  { price: '$649',   usage: 'Up to 3,000 guest stays / month', overage: 'Overage: $0.15 per guest stay' },
  },
  professional: {
    small:  { price: '$499',   usage: 'Up to 1,200 guest stays / month', overage: 'Overage: $0.10 per guest stay' },
    mid:    { price: '$799',   usage: 'Up to 3,000 guest stays / month', overage: 'Overage: $0.10 per guest stay' },
    large:  { price: '$1,099', usage: 'Up to 6,000 guest stays / month', overage: 'Overage: $0.10 per guest stay' },
  },
  enterprise: {
    small:  { price: '$899',   usage: 'Up to 2,500 guest stays / month',  overage: 'Overage: $0.07 per guest stay' },
    mid:    { price: '$1,299', usage: 'Up to 6,000 guest stays / month',  overage: 'Overage: $0.07 per guest stay' },
    large:  { price: '$1,799', usage: 'Up to 12,000 guest stays / month', overage: 'Overage: $0.07 per guest stay' },
  },
};

export function getBandPricing(planId: string, size: ResortSize): BandPricing | null {
  return BAND_PRICING[planId]?.[size] ?? null;
}
