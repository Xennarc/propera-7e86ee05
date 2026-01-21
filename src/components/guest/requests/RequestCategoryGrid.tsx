import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Wine,
  Sparkles,
  Wrench,
  Utensils,
  BedDouble,
  ShowerHead,
  Package,
  MessageSquarePlus,
  Shirt,
  Scissors,
  Droplets,
  Baby,
  LucideIcon,
} from 'lucide-react';

export interface CategoryConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  color: string;
}

// Category configurations with premium feel
const categoryConfigs: CategoryConfig[] = [
  {
    key: 'HOUSEKEEPING',
    label: 'Housekeeping',
    icon: Sparkles,
    description: 'Room cleaning & fresh towels',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    key: 'MINIBAR',
    label: 'Minibar',
    icon: Wine,
    description: 'Drinks & snack refill',
    color: 'from-purple-500 to-pink-500',
  },
  {
    key: 'TOILETRIES',
    label: 'Toiletries',
    icon: Droplets,
    description: 'Bathroom essentials',
    color: 'from-sky-500 to-blue-500',
  },
  {
    key: 'LAUNDRY',
    label: 'Laundry',
    icon: Shirt,
    description: 'Cleaning & pressing',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    key: 'ENGINEERING',
    label: 'Maintenance',
    icon: Wrench,
    description: 'Repairs & fixes',
    color: 'from-orange-500 to-amber-500',
  },
  {
    key: 'ROOM_SERVICE',
    label: 'In-Room Dining',
    icon: Utensils,
    description: 'Food & beverages',
    color: 'from-rose-500 to-red-500',
  },
  {
    key: 'AMENITIES',
    label: 'Amenities',
    icon: Package,
    description: 'Extra pillows, blankets',
    color: 'from-emerald-500 to-green-500',
  },
  {
    key: 'OTHER',
    label: 'Other Request',
    icon: MessageSquarePlus,
    description: 'Anything else',
    color: 'from-slate-500 to-gray-500',
  },
];

interface RequestCategoryGridProps {
  onSelectCategory: (category: CategoryConfig) => void;
}

const CategoryTile = memo(({ category, onSelect }: { 
  category: CategoryConfig; 
  onSelect: () => void;
}) => {
  const Icon = category.icon;
  
  return (
    <Card 
      className={cn(
        'group relative overflow-hidden cursor-pointer transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10',
        'active:scale-[0.98] tap-highlight-none',
        'bg-card/60 backdrop-blur-sm border-border/50'
      )}
      onClick={onSelect}
    >
      {/* Gradient background on hover */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300',
        category.color
      )} />
      
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center',
          'bg-gradient-to-br shadow-lg',
          category.color
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground">
            {category.label}
          </h3>
          {category.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {category.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
CategoryTile.displayName = 'CategoryTile';

export function RequestCategoryGrid({ onSelectCategory }: RequestCategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categoryConfigs.map((category) => (
        <CategoryTile
          key={category.key}
          category={category}
          onSelect={() => onSelectCategory(category)}
        />
      ))}
    </div>
  );
}

export { categoryConfigs };
