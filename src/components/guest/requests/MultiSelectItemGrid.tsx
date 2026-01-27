import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Minus, Plus } from 'lucide-react';
import { CatalogItem } from '@/hooks/useServiceRequests';
import { categoryConfigs } from './RequestCategoryGrid';

export interface SelectedItem {
  catalogId: string;
  title: string;
  quantity: number;
  category: string;
  departmentKey: string;
}

interface MultiSelectItemGridProps {
  items: CatalogItem[];
  selectedItems: SelectedItem[];
  onToggleItem: (item: CatalogItem) => void;
  onUpdateQuantity: (catalogId: string, delta: number) => void;
}

const ItemTile = memo(function ItemTile({
  item,
  selected,
  quantity,
  onToggle,
  onUpdateQuantity,
}: {
  item: CatalogItem;
  selected: boolean;
  quantity: number;
  onToggle: () => void;
  onUpdateQuantity: (delta: number) => void;
}) {
  const category = categoryConfigs.find(
    (c) => c.key === item.category || c.key === item.department_key
  ) || categoryConfigs[categoryConfigs.length - 1];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden cursor-pointer transition-all duration-200',
          'hover:shadow-md active:scale-[0.98] tap-highlight-none',
          'min-h-[72px]',
          selected 
            ? 'ring-2 ring-primary shadow-lg shadow-primary/20' 
            : 'hover:border-primary/30'
        )}
        onClick={onToggle}
        role="checkbox"
        aria-checked={selected}
        aria-label={`${item.title}${selected ? ', selected' : ''}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* Selected gradient overlay */}
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none"
          />
        )}
        
        <CardContent className="p-3 relative z-10">
          <div className="flex items-start gap-2.5">
            {/* Leading selection indicator */}
            <div className="flex-shrink-0 pt-0.5">
              <motion.div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-200',
                  selected
                    ? 'bg-primary'
                    : 'border-2 border-muted-foreground/30'
                )}
                initial={false}
                animate={selected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {selected ? (
                  <Check className="h-3 w-3 text-primary-foreground" />
                ) : (
                  <span className="sr-only">Unselected</span>
                )}
              </motion.div>
            </div>

            {/* Category icon */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                'border-2 bg-transparent transition-all duration-200',
                category.ringColor,
                selected && 'shadow-sm'
              )}
            >
              <category.icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {item.title}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {category.label}
              </p>
            </div>

            {/* Quantity badge when selected */}
            <AnimatePresence>
              {selected && quantity > 1 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Badge 
                    variant="default" 
                    className="text-[10px] px-1.5 py-0 h-5 font-bold"
                  >
                    ×{quantity}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quantity controls when selected */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center',
                      'bg-muted hover:bg-muted/80 transition-colors',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(-1);
                    }}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <motion.span 
                    key={quantity}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-base font-bold tabular-nums w-8 text-center"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    type="button"
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center',
                      'bg-muted hover:bg-muted/80 transition-colors',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(1);
                    }}
                    disabled={quantity >= 10}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export function MultiSelectItemGrid({
  items,
  selectedItems,
  onToggleItem,
  onUpdateQuantity,
}: MultiSelectItemGridProps) {
  const selectedMap = useMemo(() => {
    const map = new Map<string, SelectedItem>();
    selectedItems.forEach((item) => map.set(item.catalogId, item));
    return map;
  }, [selectedItems]);

  // Group items by category for better organization
  const groupedItems = useMemo(() => {
    const groups = new Map<string, CatalogItem[]>();
    items.forEach((item) => {
      const key = item.category || item.department_key;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-5" role="group" aria-label="Select items">
      {Array.from(groupedItems.entries()).map(([categoryKey, categoryItems]) => {
        const category = categoryConfigs.find((c) => c.key === categoryKey);
        const CategoryIcon = category?.icon;
        
        return (
          <motion.div 
            key={categoryKey} 
            className="space-y-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Enhanced section header with icon */}
            <div className="flex items-center gap-2 px-1">
              {CategoryIcon && (
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border-2 bg-transparent',
                  category?.ringColor
                )}>
                  <CategoryIcon className="h-3 w-3" />
                </div>
              )}
              <h3 className="text-sm font-medium text-foreground">
                {category?.label || categoryKey}
              </h3>
              <span className="text-xs text-muted-foreground">
                ({categoryItems.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categoryItems.map((item) => {
                const selected = selectedMap.get(item.id);
                return (
                  <ItemTile
                    key={item.id}
                    item={item}
                    selected={!!selected}
                    quantity={selected?.quantity || 1}
                    onToggle={() => onToggleItem(item)}
                    onUpdateQuantity={(delta) => onUpdateQuantity(item.id, delta)}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Selected items summary for the bottom bar
export function SelectedItemsSummary({ items }: { items: SelectedItem[] }) {
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.slice(0, 3).map((item) => (
        <Badge
          key={item.catalogId}
          variant="secondary"
          className="text-xs gap-1"
        >
          {item.title}
          {item.quantity > 1 && (
            <span className="font-bold">×{item.quantity}</span>
          )}
        </Badge>
      ))}
      {items.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{items.length - 3} more
        </Badge>
      )}
    </div>
  );
}
