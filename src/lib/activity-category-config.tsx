import { ComponentType } from 'react';
import {
  IconDiving,
  IconActivities,
  IconRestaurants,
  IconSpa,
  IconWatersports,
  IconExcursion,
  IconOther,
  IconSnorkeling,
  IconFitness,
  IconKids,
  IconTransfer,
  IconBar,
} from '@/components/icons/ProperaIcons';

export type ActivityCategoryKey = 
  | 'DIVE' 
  | 'EXCURSION' 
  | 'WATERSPORT' 
  | 'SPA' 
  | 'OTHER'
  | 'SNORKELING'
  | 'FITNESS'
  | 'KIDS'
  | 'TRANSFER'
  | 'BAR'
  | 'DINING';

interface CategoryConfig {
  key: ActivityCategoryKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const activityCategoryConfig: Record<ActivityCategoryKey, CategoryConfig> = {
  DIVE: {
    key: 'DIVE',
    label: 'Diving',
    shortLabel: 'Dive',
    description: 'Scuba diving and dive courses',
    icon: IconDiving,
    colorClass: 'text-info',
    bgClass: 'bg-info/10',
    borderClass: 'border-info/30',
  },
  EXCURSION: {
    key: 'EXCURSION',
    label: 'Excursions',
    shortLabel: 'Excursion',
    description: 'Island trips and boat tours',
    icon: IconExcursion,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/30',
  },
  WATERSPORT: {
    key: 'WATERSPORT',
    label: 'Watersports',
    shortLabel: 'Watersport',
    description: 'Surfing, kayaking, and water activities',
    icon: IconWatersports,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/30',
  },
  SPA: {
    key: 'SPA',
    label: 'Spa & Wellness',
    shortLabel: 'Spa',
    description: 'Relaxation and treatments',
    icon: IconSpa,
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-accent/30',
  },
  SNORKELING: {
    key: 'SNORKELING',
    label: 'Snorkeling',
    shortLabel: 'Snorkel',
    description: 'House reef and snorkel trips',
    icon: IconSnorkeling,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/30',
  },
  FITNESS: {
    key: 'FITNESS',
    label: 'Fitness & Gym',
    shortLabel: 'Fitness',
    description: 'Workouts and fitness classes',
    icon: IconFitness,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/30',
  },
  KIDS: {
    key: 'KIDS',
    label: 'Kids & Family',
    shortLabel: 'Kids',
    description: 'Family-friendly activities',
    icon: IconKids,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/30',
  },
  TRANSFER: {
    key: 'TRANSFER',
    label: 'Transfers',
    shortLabel: 'Transfer',
    description: 'Airport and island transfers',
    icon: IconTransfer,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
    borderClass: 'border-muted',
  },
  BAR: {
    key: 'BAR',
    label: 'Bars & Lounge',
    shortLabel: 'Bar',
    description: 'Cocktails and beverages',
    icon: IconBar,
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-accent/30',
  },
  DINING: {
    key: 'DINING',
    label: 'Dining',
    shortLabel: 'Dining',
    description: 'Restaurant reservations',
    icon: IconRestaurants,
    colorClass: 'text-sand',
    bgClass: 'bg-sand/10',
    borderClass: 'border-sand/30',
  },
  OTHER: {
    key: 'OTHER',
    label: 'Other',
    shortLabel: 'Other',
    description: 'Miscellaneous experiences',
    icon: IconOther,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
    borderClass: 'border-muted',
  },
};

/**
 * Get the category configuration for a given category key.
 * Returns 'OTHER' config if category is not found.
 */
export function getCategoryConfig(category: string | null | undefined): CategoryConfig {
  if (!category) return activityCategoryConfig.OTHER;
  const key = category.toUpperCase() as ActivityCategoryKey;
  return activityCategoryConfig[key] || activityCategoryConfig.OTHER;
}

/**
 * Get the icon component for a category.
 */
export function getCategoryIcon(category: string | null | undefined): ComponentType<{ className?: string; size?: number }> {
  return getCategoryConfig(category).icon;
}

/**
 * Get all category options for filters/selects.
 * Optionally filter to only include certain categories.
 */
export function getCategoryOptions(includeOnly?: ActivityCategoryKey[]): Array<{ value: string; label: string }> {
  const allCategories = Object.values(activityCategoryConfig);
  const filtered = includeOnly 
    ? allCategories.filter(c => includeOnly.includes(c.key))
    : allCategories;
  return filtered.map(c => ({ value: c.key, label: c.label }));
}

/**
 * Core activity categories used in the database.
 */
export const coreActivityCategories: ActivityCategoryKey[] = ['DIVE', 'EXCURSION', 'WATERSPORT', 'SPA', 'OTHER'];
