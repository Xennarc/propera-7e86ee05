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
    >
      <Card
        className={cn(
          'relative overflow-hidden cursor-pointer transition-all duration-200',
          'hover:shadow-md active:scale-[0.98] tap-highlight-none',
          selected && 'ring-2 ring-primary shadow-lg shadow-primary/20 bg-primary/5'
        )}
        onClick={onToggle}
      >
        {/* Selection indicator */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10"
            >
              <Check className="h-3 w-3 text-primary-foreground" />
            </motion.div>
          )}
        </AnimatePresence>

        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                'bg-gradient-to-br',
                category.color
              )}
            >
              <category.icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {item.title}
              </h4>
              <p className="text-[10px] text-muted-foreground">
                {category.label}
              </p>
            </div>
          </div>

          {/* Quantity controls when selected */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(-1);
                    }}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-semibold tabular-nums w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(1);
                    }}
                    disabled={quantity >= 10}
                  >
                    <Plus className="h-3 w-3" />
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
    <div className="space-y-4">
      {Array.from(groupedItems.entries()).map(([categoryKey, categoryItems]) => {
        const category = categoryConfigs.find((c) => c.key === categoryKey);
        
        return (
          <div key={categoryKey} className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              {category?.label || categoryKey}
            </h3>
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
          </div>
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
