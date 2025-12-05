import { ComponentType } from 'react';
import {
  Anchor,
  Waves,
  Ship,
  Compass,
  Palmtree,
  Sunrise,
  Sunset,
  Fish,
  Bike,
  Mountain,
  Camera,
  Music,
  Sparkles,
  Heart,
  Star,
  Flame,
  Zap,
  Wind,
  Droplets,
  Sun,
  Moon,
  CloudSun,
  Plane,
  Car,
  Dumbbell,
  Trophy,
  Target,
  Gamepad2,
  Tent,
  TreePine,
  Flower2,
  Bird,
  Footprints,
  Glasses,
  PartyPopper,
  Gift,
  Cake,
  Wine,
  Coffee,
  UtensilsCrossed,
  ChefHat,
  Soup,
  Pizza,
  IceCream,
  Salad,
  Leaf,
  Shell,
  type LucideIcon,
} from 'lucide-react';
import {
  IconDiving,
  IconSpa,
  IconWatersports,
  IconExcursion,
  IconSnorkeling,
  IconFitness,
  IconKids,
  IconTransfer,
  IconBar,
  IconRestaurants,
  IconOther,
} from '@/components/icons/ProperaIcons';

export interface ActivityIconOption {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  category?: string;
}

// All available icons for activity selection
export const activityIconOptions: ActivityIconOption[] = [
  // Water activities
  { key: 'diving', label: 'Diving', icon: IconDiving, category: 'Water' },
  { key: 'snorkeling', label: 'Snorkeling', icon: IconSnorkeling, category: 'Water' },
  { key: 'watersports', label: 'Watersports', icon: IconWatersports, category: 'Water' },
  { key: 'anchor', label: 'Anchor', icon: Anchor as any, category: 'Water' },
  { key: 'waves', label: 'Waves', icon: Waves as any, category: 'Water' },
  { key: 'fish', label: 'Fish', icon: Fish as any, category: 'Water' },
  { key: 'shell', label: 'Shell', icon: Shell as any, category: 'Water' },
  { key: 'droplets', label: 'Droplets', icon: Droplets as any, category: 'Water' },

  // Transport & Excursions
  { key: 'excursion', label: 'Boat', icon: IconExcursion, category: 'Excursion' },
  { key: 'ship', label: 'Ship', icon: Ship as any, category: 'Excursion' },
  { key: 'compass', label: 'Compass', icon: Compass as any, category: 'Excursion' },
  { key: 'plane', label: 'Plane', icon: Plane as any, category: 'Excursion' },
  { key: 'car', label: 'Car', icon: Car as any, category: 'Excursion' },
  { key: 'transfer', label: 'Transfer', icon: IconTransfer, category: 'Excursion' },

  // Nature & Beach
  { key: 'palmtree', label: 'Palm Tree', icon: Palmtree as any, category: 'Nature' },
  { key: 'sunrise', label: 'Sunrise', icon: Sunrise as any, category: 'Nature' },
  { key: 'sunset', label: 'Sunset', icon: Sunset as any, category: 'Nature' },
  { key: 'sun', label: 'Sun', icon: Sun as any, category: 'Nature' },
  { key: 'moon', label: 'Moon', icon: Moon as any, category: 'Nature' },
  { key: 'cloudsun', label: 'Cloud Sun', icon: CloudSun as any, category: 'Nature' },
  { key: 'mountain', label: 'Mountain', icon: Mountain as any, category: 'Nature' },
  { key: 'treepine', label: 'Tree', icon: TreePine as any, category: 'Nature' },
  { key: 'flower', label: 'Flower', icon: Flower2 as any, category: 'Nature' },
  { key: 'leaf', label: 'Leaf', icon: Leaf as any, category: 'Nature' },
  { key: 'bird', label: 'Bird', icon: Bird as any, category: 'Nature' },
  { key: 'tent', label: 'Tent', icon: Tent as any, category: 'Nature' },

  // Wellness & Spa
  { key: 'spa', label: 'Spa', icon: IconSpa, category: 'Wellness' },
  { key: 'heart', label: 'Heart', icon: Heart as any, category: 'Wellness' },
  { key: 'sparkles', label: 'Sparkles', icon: Sparkles as any, category: 'Wellness' },
  { key: 'wind', label: 'Wind', icon: Wind as any, category: 'Wellness' },

  // Sports & Fitness
  { key: 'fitness', label: 'Fitness', icon: IconFitness, category: 'Sports' },
  { key: 'dumbbell', label: 'Dumbbell', icon: Dumbbell as any, category: 'Sports' },
  { key: 'bike', label: 'Bike', icon: Bike as any, category: 'Sports' },
  { key: 'footprints', label: 'Footprints', icon: Footprints as any, category: 'Sports' },
  { key: 'target', label: 'Target', icon: Target as any, category: 'Sports' },
  { key: 'trophy', label: 'Trophy', icon: Trophy as any, category: 'Sports' },

  // Family & Fun
  { key: 'kids', label: 'Kids', icon: IconKids, category: 'Family' },
  { key: 'gamepad', label: 'Games', icon: Gamepad2 as any, category: 'Family' },
  { key: 'party', label: 'Party', icon: PartyPopper as any, category: 'Family' },
  { key: 'gift', label: 'Gift', icon: Gift as any, category: 'Family' },
  { key: 'cake', label: 'Cake', icon: Cake as any, category: 'Family' },

  // Dining & Drinks
  { key: 'dining', label: 'Dining', icon: IconRestaurants, category: 'Dining' },
  { key: 'utensils', label: 'Utensils', icon: UtensilsCrossed as any, category: 'Dining' },
  { key: 'chef', label: 'Chef', icon: ChefHat as any, category: 'Dining' },
  { key: 'bar', label: 'Cocktail', icon: IconBar, category: 'Dining' },
  { key: 'wine', label: 'Wine', icon: Wine as any, category: 'Dining' },
  { key: 'coffee', label: 'Coffee', icon: Coffee as any, category: 'Dining' },
  { key: 'soup', label: 'Soup', icon: Soup as any, category: 'Dining' },
  { key: 'pizza', label: 'Pizza', icon: Pizza as any, category: 'Dining' },
  { key: 'icecream', label: 'Ice Cream', icon: IceCream as any, category: 'Dining' },
  { key: 'salad', label: 'Salad', icon: Salad as any, category: 'Dining' },

  // Other
  { key: 'camera', label: 'Camera', icon: Camera as any, category: 'Other' },
  { key: 'music', label: 'Music', icon: Music as any, category: 'Other' },
  { key: 'glasses', label: 'Glasses', icon: Glasses as any, category: 'Other' },
  { key: 'star', label: 'Star', icon: Star as any, category: 'Other' },
  { key: 'flame', label: 'Flame', icon: Flame as any, category: 'Other' },
  { key: 'zap', label: 'Zap', icon: Zap as any, category: 'Other' },
  { key: 'other', label: 'Other', icon: IconOther, category: 'Other' },
];

// Get icon by key
export function getActivityIcon(iconKey: string | null | undefined): ComponentType<{ className?: string; size?: number }> {
  if (!iconKey) return IconOther;
  const found = activityIconOptions.find(o => o.key === iconKey);
  return found?.icon || IconOther;
}

// Get icon option by key
export function getActivityIconOption(iconKey: string | null | undefined): ActivityIconOption | undefined {
  if (!iconKey) return undefined;
  return activityIconOptions.find(o => o.key === iconKey);
}

// Group icons by category
export function getIconsByCategory(): Record<string, ActivityIconOption[]> {
  const grouped: Record<string, ActivityIconOption[]> = {};
  for (const option of activityIconOptions) {
    const cat = option.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(option);
  }
  return grouped;
}
