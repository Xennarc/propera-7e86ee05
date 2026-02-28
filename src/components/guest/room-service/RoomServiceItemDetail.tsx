/**
 * Room Service Item Detail Modal
 * Supports modifier selection (single/multiple), quantity stepper, live price.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus, AlertTriangle, Clock, Leaf, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoomServiceItemModifiers } from '@/hooks/useRoomServiceMenu';
import type { RoomServiceMenuItem, RoomServiceModifierGroup } from '@/hooks/useRoomServiceMenu';
import type { CartItemModifier } from '@/hooks/useRoomServiceCart';

interface RoomServiceItemDetailProps {
  item: RoomServiceMenuItem | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (
    item: RoomServiceMenuItem,
    quantity: number,
    modifiers: CartItemModifier[],
    notes?: string,
  ) => void;
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  vegetarian: <Leaf className="h-3 w-3" />,
  vegan: <Leaf className="h-3 w-3" />,
  spicy: <Flame className="h-3 w-3" />,
};

export function RoomServiceItemDetail({
  item,
  open,
  onClose,
  onAddToCart,
}: RoomServiceItemDetailProps) {
  const { data: modifierGroups, isLoading: modsLoading } = useRoomServiceItemModifiers(
    item?.id,
  );

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});

  // Reset state when item changes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
        // Delay reset so exit animation completes
        setTimeout(() => {
          setQuantity(1);
          setNotes('');
          setSelectedModifiers({});
        }, 200);
      }
    },
    [onClose],
  );

  // Toggle modifier option
  const toggleModifier = useCallback(
    (group: RoomServiceModifierGroup, optionId: string) => {
      setSelectedModifiers(prev => {
        const current = prev[group.id] || [];
        if (group.selection_type === 'single') {
          return { ...prev, [group.id]: current.includes(optionId) ? [] : [optionId] };
        }
        // Multiple
        if (current.includes(optionId)) {
          return { ...prev, [group.id]: current.filter(id => id !== optionId) };
        }
        if (group.max_selected && current.length >= group.max_selected) {
          return prev; // At max
        }
        return { ...prev, [group.id]: [...current, optionId] };
      });
    },
    [],
  );

  // Compute total price
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    let base = item.price;
    if (modifierGroups) {
      for (const group of modifierGroups) {
        const selected = selectedModifiers[group.id] || [];
        for (const opt of group.options) {
          if (selected.includes(opt.id)) {
            base += opt.price_delta;
          }
        }
      }
    }
    return base * quantity;
  }, [item, modifierGroups, selectedModifiers, quantity]);

  // Validate required modifiers
  const isValid = useMemo(() => {
    if (!modifierGroups) return true;
    return modifierGroups.every(g => {
      const selected = selectedModifiers[g.id] || [];
      return selected.length >= g.min_selected;
    });
  }, [modifierGroups, selectedModifiers]);

  const handleAdd = useCallback(() => {
    if (!item || !isValid) return;
    const mods: CartItemModifier[] = [];
    if (modifierGroups) {
      for (const group of modifierGroups) {
        const selected = selectedModifiers[group.id] || [];
        for (const opt of group.options) {
          if (selected.includes(opt.id)) {
            mods.push({ id: opt.id, name: opt.name, price_delta: opt.price_delta });
          }
        }
      }
    }
    onAddToCart(item, quantity, mods, notes.trim() || undefined);
    handleOpenChange(false);
  }, [item, isValid, modifierGroups, selectedModifiers, quantity, notes, onAddToCart, handleOpenChange]);

  if (!item) return null;

  const currency = item.currency || 'USD';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Hero image */}
        {item.image_url && (
          <div className="relative w-full h-48 overflow-hidden flex-shrink-0">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-xl font-bold text-foreground leading-tight">
              {item.name}
            </DialogTitle>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Tags + Allergens row */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.tags?.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[11px] gap-1 px-2 py-0.5"
                >
                  {TAG_ICONS[tag.toLowerCase()]}
                  {tag}
                </Badge>
              ))}
              {item.allergens && item.allergens.length > 0 && (
                <Badge variant="outline" className="text-[11px] gap-1 px-2 py-0.5 border-destructive/30 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {item.allergens.join(', ')}
                </Badge>
              )}
              {item.prep_time_minutes && (
                <Badge variant="outline" className="text-[11px] gap-1 px-2 py-0.5">
                  <Clock className="h-3 w-3" />
                  {item.prep_time_minutes} min
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Modifier groups */}
          <div className="px-5 pb-3 space-y-5">
            {modsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              modifierGroups?.map(group => {
                const selected = selectedModifiers[group.id] || [];
                const isRequired = group.min_selected > 0;
                return (
                  <div key={group.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {group.name}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {isRequired ? 'Required' : 'Optional'}
                        {group.selection_type === 'single'
                          ? ' · Pick 1'
                          : group.max_selected
                          ? ` · Up to ${group.max_selected}`
                          : ''}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {group.options.map(opt => {
                        const isSelected = selected.includes(opt.id);
                        const atMax =
                          group.selection_type === 'multiple' &&
                          group.max_selected !== null &&
                          selected.length >= group.max_selected &&
                          !isSelected;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={atMax}
                            onClick={() => toggleModifier(group, opt.id)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left',
                              isSelected
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                : 'border-border hover:border-primary/40',
                              atMax && 'opacity-40 cursor-not-allowed',
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                                  group.selection_type === 'multiple' && 'rounded',
                                  isSelected
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground/40',
                                )}
                              >
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                                )}
                              </div>
                              <span className="text-sm text-foreground">{opt.name}</span>
                            </div>
                            {opt.price_delta > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{currency} {opt.price_delta.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Special requests
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. No onions, extra sauce..."
                className="resize-none text-base"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Footer: quantity + add to cart */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold text-foreground w-6 text-center">
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-lg font-bold text-primary">
              {currency} {totalPrice.toFixed(2)}
            </span>
          </div>
          <Button
            className="w-full h-12 rounded-xl text-base font-semibold"
            onClick={handleAdd}
            disabled={!isValid || !item.is_available}
          >
            {!item.is_available
              ? 'Currently unavailable'
              : !isValid
              ? 'Select required options'
              : 'Add to order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
