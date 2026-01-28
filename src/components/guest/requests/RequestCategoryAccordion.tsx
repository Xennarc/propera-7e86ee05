import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RequestOptionChip } from './RequestOptionChip';
import { CatalogItem } from '@/hooks/useServiceRequests';
import { SelectedItem } from './MultiSelectItemGrid';
import { categoryConfigs, CategoryConfig } from './RequestCategoryGrid';

interface RequestCategoryAccordionProps {
  items: CatalogItem[];
  selectedItems: SelectedItem[];
  onToggleItem: (item: CatalogItem) => void;
  defaultOpenCategories?: string[];
}

export const RequestCategoryAccordion = memo(function RequestCategoryAccordion({
  items,
  selectedItems,
  onToggleItem,
  defaultOpenCategories,
}: RequestCategoryAccordionProps) {
  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, CatalogItem[]>();
    
    items.forEach((item) => {
      const key = item.category || item.department_key;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    
    // Sort groups by category order
    const orderedCategories = categoryConfigs.map((c) => c.key);
    return Array.from(groups.entries()).sort((a, b) => {
      const aIndex = orderedCategories.indexOf(a[0]);
      const bIndex = orderedCategories.indexOf(b[0]);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }, [items]);

  // Create a map for quick selected item lookup
  const selectedMap = useMemo(() => {
    const map = new Map<string, SelectedItem>();
    selectedItems.forEach((item) => map.set(item.catalogId, item));
    return map;
  }, [selectedItems]);

  // Calculate selected count per category
  const categorySelectedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    selectedItems.forEach((item) => {
      const key = item.category || item.departmentKey;
      counts.set(key, (counts.get(key) || 0) + item.quantity);
    });
    return counts;
  }, [selectedItems]);

  // Default to first category with items open
  const defaultValue = useMemo(() => {
    if (defaultOpenCategories?.length) return defaultOpenCategories;
    if (groupedItems.length > 0) return [groupedItems[0][0]];
    return [];
  }, [groupedItems, defaultOpenCategories]);

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultValue}
      className="space-y-2"
    >
      {groupedItems.map(([categoryKey, categoryItems]) => {
        const category = categoryConfigs.find((c) => c.key === categoryKey) || categoryConfigs[categoryConfigs.length - 1];
        const selectedCount = categorySelectedCounts.get(categoryKey) || 0;
        const CategoryIcon = category.icon;

        return (
          <AccordionItem
            key={categoryKey}
            value={categoryKey}
            className={cn(
              'border rounded-2xl overflow-hidden',
              'bg-card/40 backdrop-blur-sm',
              'border-border/50 hover:border-border/80',
              'transition-all duration-200',
              'hover:shadow-sm hover:-translate-y-0.5', // Add hover lift
              selectedCount > 0 && 'border-primary/30 bg-primary/5 shadow-sm shadow-primary/10'
            )}
          >
            <AccordionTrigger
              className={cn(
                'px-4 py-3 hover:no-underline',
                '[&[data-state=open]>svg]:rotate-180',
                '[&>svg]:transition-transform [&>svg]:duration-200'
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Category icon with ring - enhanced shadow when selected */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    'border-2 bg-transparent transition-all duration-200',
                    category.ringColor,
                    selectedCount > 0 && 'shadow-md shadow-primary/25 scale-105'
                  )}
                >
                  <CategoryIcon className="h-4 w-4" />
                </div>

                {/* Category name */}
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-medium text-foreground">
                    {category.label}
                  </span>
                  {category.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {category.description}
                    </p>
                  )}
                </div>

                {/* Selected count badge */}
                <AnimatePresence>
                  {selectedCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Badge
                        variant="default"
                        className="text-xs font-bold px-2 py-0.5"
                      >
                        {selectedCount} selected
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4 pt-1">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={`${category.label} options`}
              >
                {categoryItems.map((item) => {
                  const selected = selectedMap.get(item.id);
                  return (
                    <RequestOptionChip
                      key={item.id}
                      id={item.id}
                      label={item.title}
                      selected={!!selected}
                      quantity={selected?.quantity}
                      onToggle={() => onToggleItem(item)}
                    />
                  );
                })}
              </motion.div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
});
