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
  /** Text color class using semantic category tokens */
  colorClass: string;
  /** Background color class using semantic category tokens */
  bgClass: string;
  /** Border color class using semantic category tokens */
  borderClass: string;
  /** Chip class for category badges */
  chipClass: string;
}

export const activityCategoryConfig: Record<ActivityCategoryKey, CategoryConfig> = {
  DIVE: {
    key: 'DIVE',
    label: 'Diving',
    shortLabel: 'Dive',
    description: 'Scuba diving and dive courses',
    icon: IconDiving,
    colorClass: 'text-category-dive',
    bgClass: 'bg-lagoon/10',
    borderClass: 'border-lagoon/30',
    chipClass: 'chip-category-dive',
  },
  EXCURSION: {
    key: 'EXCURSION',
    label: 'Excursions',
    shortLabel: 'Excursion',
    description: 'Island trips and boat tours',
    icon: IconExcursion,
    colorClass: 'text-category-excursion',
    bgClass: 'bg-sunset/10',
    borderClass: 'border-sunset/30',
    chipClass: 'chip-category-excursion',
  },
  WATERSPORT: {
    key: 'WATERSPORT',
    label: 'Watersports',
    shortLabel: 'Watersport',
    description: 'Surfing, kayaking, and water activities',
    icon: IconWatersports,
    colorClass: 'text-category-watersport',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/30',
    chipClass: 'chip-category-watersport',
  },
  SPA: {
    key: 'SPA',
    label: 'Spa & Wellness',
    shortLabel: 'Spa',
    description: 'Relaxation and treatments',
    icon: IconSpa,
    colorClass: 'text-category-spa',
    bgClass: 'bg-orchid/10',
    borderClass: 'border-orchid/30',
    chipClass: 'chip-category-spa',
  },
  SNORKELING: {
    key: 'SNORKELING',
    label: 'Snorkeling',
    shortLabel: 'Snorkel',
    description: 'House reef and snorkel trips',
    icon: IconSnorkeling,
    colorClass: 'text-category-snorkeling',
    bgClass: 'bg-lagoon/10',
    borderClass: 'border-lagoon/30',
    chipClass: 'chip-category-dive',
  },
  FITNESS: {
    key: 'FITNESS',
    label: 'Fitness & Gym',
    shortLabel: 'Fitness',
    description: 'Workouts and fitness classes',
    icon: IconFitness,
    colorClass: 'text-category-fitness',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/30',
    chipClass: 'chip-category-fitness',
  },
  KIDS: {
    key: 'KIDS',
    label: 'Kids & Family',
    shortLabel: 'Kids',
    description: 'Family-friendly activities',
    icon: IconKids,
    colorClass: 'text-category-kids',
    bgClass: 'bg-teal-300/10',
    borderClass: 'border-teal-300/30',
    chipClass: 'chip-category-kids',
  },
  TRANSFER: {
    key: 'TRANSFER',
    label: 'Transfers',
    shortLabel: 'Transfer',
    description: 'Airport and island transfers',
    icon: IconTransfer,
    colorClass: 'text-category-transfer',
    bgClass: 'bg-muted/50',
    borderClass: 'border-muted',
    chipClass: 'chip-neutral',
  },
  BAR: {
    key: 'BAR',
    label: 'Bars & Lounge',
    shortLabel: 'Bar',
    description: 'Cocktails and beverages',
    icon: IconBar,
    colorClass: 'text-category-bar',
    bgClass: 'bg-coral/10',
    borderClass: 'border-coral/30',
    chipClass: 'chip-category-bar',
  },
  DINING: {
    key: 'DINING',
    label: 'Dining',
    shortLabel: 'Dining',
    description: 'Restaurant reservations',
    icon: IconRestaurants,
    colorClass: 'text-category-dining',
    bgClass: 'bg-sand/15',
    borderClass: 'border-sand/30',
    chipClass: 'chip-category-dining',
  },
  OTHER: {
    key: 'OTHER',
    label: 'Other',
    shortLabel: 'Other',
    description: 'Miscellaneous experiences',
    icon: IconOther,
    colorClass: 'text-category-other',
    bgClass: 'bg-muted/50',
    borderClass: 'border-muted',
    chipClass: 'chip-neutral',
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
