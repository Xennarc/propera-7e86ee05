import { memo } from 'react';
import { motion } from 'framer-motion';
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const tileVariants = {
  hidden: { 
    opacity: 0, 
    y: 16, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

const CategoryTile = memo(({ category, onSelect }: { 
  category: CategoryConfig; 
  onSelect: () => void;
}) => {
  const Icon = category.icon;
  
  return (
    <motion.div
      variants={tileVariants}
      whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      whileTap={{ scale: 0.97 }}
    >
      <Card 
        className={cn(
          'group relative overflow-hidden cursor-pointer transition-all duration-300',
          'hover:shadow-xl hover:shadow-primary/10',
          'active:shadow-lg tap-highlight-none',
          'bg-card/60 backdrop-blur-sm border-border/50'
        )}
        onClick={onSelect}
      >
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300" />
        
        {/* Larger padding for better touch targets */}
        <CardContent className="p-5 flex flex-col items-center text-center gap-3 relative z-10">
          <motion.div 
            className={cn(
              // 60px icon container for touch (15 × 4)
              'w-[60px] h-[60px] rounded-full flex items-center justify-center',
              'border-2 bg-transparent transition-all duration-300',
              'group-hover:shadow-lg',
              category.ringColor
            )}
            whileHover={{ 
              boxShadow: '0 0 20px currentColor',
            }}
          >
            <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
          </motion.div>
          
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-foreground">
              {category.label}
            </h3>
            {category.description && (
              // Minimum 12px (text-xs) for mobile readability
              <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-muted-foreground/80 transition-colors">
                {category.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
CategoryTile.displayName = 'CategoryTile';

export function RequestCategoryGrid({ onSelectCategory }: RequestCategoryGridProps) {
  return (
    <motion.div 
      className="grid grid-cols-2 gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {categoryConfigs.map((category) => (
        <CategoryTile
          key={category.key}
          category={category}
          onSelect={() => onSelectCategory(category)}
        />
      ))}
    </motion.div>
  );
}

export { categoryConfigs };
