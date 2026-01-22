import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Wine,
  Sparkles,
  Wrench,
  Utensils,
  Droplets,
  Package,
  MessageSquarePlus,
  Shirt,
  LucideIcon,
} from 'lucide-react';

export interface CategoryConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  ringColor: string;
}

// Category configurations with minimal ring styling
const categoryConfigs: CategoryConfig[] = [
  {
    key: 'HOUSEKEEPING',
    label: 'Housekeeping',
    icon: Sparkles,
    description: 'Room cleaning & fresh towels',
    ringColor: 'border-cyan-400 text-cyan-400',
  },
  {
    key: 'MINIBAR',
    label: 'Minibar',
    icon: Wine,
    description: 'Drinks & snack refill',
    ringColor: 'border-red-400 text-red-400',
  },
  {
    key: 'TOILETRIES',
    label: 'Toiletries',
    icon: Droplets,
    description: 'Bathroom essentials',
    ringColor: 'border-teal-400 text-teal-400',
  },
  {
    key: 'LAUNDRY',
    label: 'Laundry',
    icon: Shirt,
    description: 'Cleaning & pressing',
    ringColor: 'border-purple-400 text-purple-400',
  },
  {
    key: 'ENGINEERING',
    label: 'Maintenance',
    icon: Wrench,
    description: 'Repairs & fixes',
    ringColor: 'border-green-400 text-green-400',
  },
  {
    key: 'ROOM_SERVICE',
    label: 'In-Room Dining',
    icon: Utensils,
    description: 'Food & beverages',
    ringColor: 'border-pink-400 text-pink-400',
  },
  {
    key: 'AMENITIES',
    label: 'Amenities',
    icon: Package,
    description: 'Extra pillows, blankets',
    ringColor: 'border-lime-400 text-lime-400',
  },
  {
    key: 'OTHER',
    label: 'Other Request',
    icon: MessageSquarePlus,
    description: 'Anything else',
    ringColor: 'border-rose-400 text-rose-400',
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
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        <div className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'border-2 bg-transparent',
          category.ringColor
        )}>
          <Icon className="h-6 w-6" />
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
