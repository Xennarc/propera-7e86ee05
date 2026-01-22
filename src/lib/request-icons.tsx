import { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  Bath,
  Bed,
  Moon,
  Wine,
  Coffee,
  Droplet,
  Cookie,
  Wrench,
  Thermometer,
  Lightbulb,
  Package,
  Shirt,
  Scissors,
  Cloud,
  Layers,
  Footprints,
  MessageCircle,
  HelpCircle,
  Brush,
  UtensilsCrossed,
  Phone,
  Key,
  Wifi,
  Tv,
  Fan,
  ShowerHead,
  Cigarette,
  Trash2,
  CircleDot,
} from 'lucide-react';

export interface RequestIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
  category: string;
}

export const requestIconOptions: RequestIconOption[] = [
  // Housekeeping
  { key: 'sparkles', label: 'Clean/Fresh', icon: Sparkles, category: 'Housekeeping' },
  { key: 'bath', label: 'Towels', icon: Bath, category: 'Housekeeping' },
  { key: 'bed', label: 'Linens', icon: Bed, category: 'Housekeeping' },
  { key: 'moon', label: 'Turndown', icon: Moon, category: 'Housekeeping' },
  { key: 'brush', label: 'Cleaning', icon: Brush, category: 'Housekeeping' },
  { key: 'trash', label: 'Trash', icon: Trash2, category: 'Housekeeping' },
  
  // Minibar / F&B
  { key: 'wine', label: 'Drinks', icon: Wine, category: 'Minibar' },
  { key: 'coffee', label: 'Coffee', icon: Coffee, category: 'Minibar' },
  { key: 'droplet', label: 'Water', icon: Droplet, category: 'Minibar' },
  { key: 'cookie', label: 'Snacks', icon: Cookie, category: 'Minibar' },
  { key: 'utensils', label: 'Food', icon: UtensilsCrossed, category: 'Minibar' },
  
  // Maintenance / Engineering
  { key: 'wrench', label: 'Repair', icon: Wrench, category: 'Maintenance' },
  { key: 'thermometer', label: 'Temperature', icon: Thermometer, category: 'Maintenance' },
  { key: 'lightbulb', label: 'Lighting', icon: Lightbulb, category: 'Maintenance' },
  { key: 'fan', label: 'AC/Fan', icon: Fan, category: 'Maintenance' },
  { key: 'wifi', label: 'Internet', icon: Wifi, category: 'Maintenance' },
  { key: 'tv', label: 'TV', icon: Tv, category: 'Maintenance' },
  { key: 'showerhead', label: 'Plumbing', icon: ShowerHead, category: 'Maintenance' },
  
  // Amenities
  { key: 'package', label: 'Package', icon: Package, category: 'Amenities' },
  { key: 'shirt', label: 'Laundry', icon: Shirt, category: 'Amenities' },
  { key: 'scissors', label: 'Kit', icon: Scissors, category: 'Amenities' },
  { key: 'cloud', label: 'Pillows', icon: Cloud, category: 'Amenities' },
  { key: 'layers', label: 'Blankets', icon: Layers, category: 'Amenities' },
  { key: 'footprints', label: 'Slippers', icon: Footprints, category: 'Amenities' },
  { key: 'cigarette', label: 'Smoking', icon: Cigarette, category: 'Amenities' },
  
  // Concierge / Other
  { key: 'phone', label: 'Phone', icon: Phone, category: 'Concierge' },
  { key: 'key', label: 'Keys', icon: Key, category: 'Concierge' },
  { key: 'message', label: 'Message', icon: MessageCircle, category: 'Concierge' },
  { key: 'help', label: 'Help', icon: HelpCircle, category: 'Concierge' },
];

/** Get the icon component for a given key, or a default CircleDot */
export function getRequestIcon(key: string | null): LucideIcon {
  if (!key) return CircleDot;
  const found = requestIconOptions.find((opt) => opt.key === key);
  return found?.icon || CircleDot;
}

/** Group icons by category for picker UI */
export function getRequestIconsByCategory(): Record<string, RequestIconOption[]> {
  return requestIconOptions.reduce((acc, opt) => {
    if (!acc[opt.category]) {
      acc[opt.category] = [];
    }
    acc[opt.category].push(opt);
    return acc;
  }, {} as Record<string, RequestIconOption[]>);
}
