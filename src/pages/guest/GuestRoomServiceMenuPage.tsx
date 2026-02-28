/**
 * Guest In-Villa Dining — Menu Browser
 *
 * Features:
 * - Category chip row (horizontal scroll)
 * - Search with debounce
 * - Featured carousel ("Popular tonight")
 * - Item cards with lazy images, availability badges
 * - Item detail modal with modifiers
 * - Floating cart CTA
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  UtensilsCrossed,
  Search,
  ShoppingBag,
  Clock,
  Star,
  MoonStar,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useRoomServiceCategories,
  useRoomServiceItems,
  useRoomServiceOpenStatus,
} from '@/hooks/useRoomServiceMenu';
import type { RoomServiceMenuItem } from '@/hooks/useRoomServiceMenu';
import { useRoomServiceCart } from '@/hooks/useRoomServiceCart';
import type { CartItemModifier } from '@/hooks/useRoomServiceCart';
import { RoomServiceItemDetail } from '@/components/guest/room-service/RoomServiceItemDetail';

// ── Cart item type export for cart page compat ────────────────
export type { CartItem } from '@/hooks/useRoomServiceCart';

export default function GuestRoomServiceMenuPage() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailItem, setDetailItem] = useState<RoomServiceMenuItem | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchInput]);

  // ── Data ──────────────────────────────────────────────────
  const { data: categories, isLoading: catsLoading } = useRoomServiceCategories();
  const { data: items, isLoading: itemsLoading } = useRoomServiceItems(
    selectedCategory,
    debouncedSearch,
  );
  const { isOpen, nextOpenTime } = useRoomServiceOpenStatus();
  const { addToCart, itemCount, getItemTotalQty } = useRoomServiceCart();

  // Featured items (across all categories)
  const { data: allItems } = useRoomServiceItems();
  const featuredItems = useMemo(
    () => (allItems || []).filter(i => i.is_featured && i.is_available),
    [allItems],
  );

  const isLoading = catsLoading || itemsLoading;

  // ── Handlers ──────────────────────────────────────────────
  const handleAddToCart = useCallback(
    (
      item: RoomServiceMenuItem,
      qty: number,
      mods: CartItemModifier[],
      notes?: string,
    ) => {
      addToCart(item, qty, mods, notes);
    },
    [addToCart],
  );

  const handleCategorySelect = useCallback((catId: string | undefined) => {
    setSelectedCategory(catId);
    setSearchInput('');
    setDebouncedSearch('');
  }, []);

  // ── Render ────────────────────────────────────────────────
  return (
    <GuestPageShell>
      <div className="px-1 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              In-Villa Dining
            </h1>
            <p className="text-xs text-muted-foreground">Delivered to your villa</p>
          </div>
          {/* Open/Closed status */}
          {isOpen ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-500 gap-1 text-[11px] px-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Open
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-muted-foreground/30 text-muted-foreground gap-1 text-[11px] px-2"
            >
              <MoonStar className="h-3 w-3" />
              Closed
            </Badge>
          )}
        </div>

        {/* Kitchen closed state */}
        {!isOpen && (
          <Card className="mt-4 border-muted-foreground/20 bg-muted/30">
            <CardContent className="p-5 text-center">
              <MoonStar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">
                Kitchen is closed
              </h3>
              <p className="text-sm text-muted-foreground">
                {nextOpenTime
                  ? `We reopen at ${nextOpenTime}`
                  : 'Please check back later'}
              </p>
            </CardContent>
          </Card>
        )}

        {isOpen && (
          <>
            {/* Search */}
            <div className="relative mt-4 mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search menu..."
                className="pl-9 pr-9 h-10 rounded-xl text-base bg-muted/50 border-border"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category chips */}
            {!catsLoading && categories && categories.length > 0 && (
              <ScrollArea className="w-full mb-5">
                <div className="flex gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(undefined)}
                    className={cn(
                      'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                      !selectedCategory
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                        selectedCategory === cat.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}

            {/* Featured carousel */}
            {!selectedCategory && !debouncedSearch && featuredItems.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                    Popular tonight
                  </h2>
                </div>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {featuredItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="flex-shrink-0 w-[160px] group"
                      >
                        <div className="relative h-[110px] rounded-xl overflow-hidden mb-2 bg-muted/40">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                          <span className="absolute bottom-2 left-2 text-xs font-bold text-foreground">
                            {item.currency} {item.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground text-left line-clamp-1">
                          {item.name}
                        </p>
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Items grid */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : !items || items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  {debouncedSearch
                    ? `No items matching "${debouncedSearch}"`
                    : 'No items in this category'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-20">
                {items.map(item => {
                  const qty = getItemTotalQty(item.id);
                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        'guest-card-interactive overflow-hidden transition-all',
                        !item.is_available && 'opacity-50 pointer-events-none',
                      )}
                      onClick={() => item.is_available && setDetailItem(item)}
                    >
                      <CardContent className="p-0">
                        <div className="flex gap-0">
                          {/* Thumbnail */}
                          <div className="relative w-24 h-24 flex-shrink-0 bg-muted/30">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UtensilsCrossed className="h-6 w-6 text-muted-foreground/20" />
                              </div>
                            )}
                            {!item.is_available && (
                              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                <Badge variant="secondary" className="text-[10px]">
                                  Unavailable
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-1">
                                  {item.name}
                                </h3>
                                <span className="text-sm font-semibold text-primary whitespace-nowrap flex-shrink-0">
                                  {item.currency} {item.price.toFixed(2)}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex gap-1 flex-wrap">
                                {item.tags?.slice(0, 2).map(tag => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 border-primary/20 text-primary/80"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {item.prep_time_minutes && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 gap-0.5"
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    {item.prep_time_minutes}m
                                  </Badge>
                                )}
                              </div>
                              {qty > 0 && (
                                <Badge className="text-[10px] px-2 bg-primary/15 text-primary border-0">
                                  {qty} in cart
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Floating cart button */}
        {itemCount > 0 && (
          <div className="fixed bottom-[calc(var(--guest-nav-h,68px)+env(safe-area-inset-bottom,0px)+12px)] left-0 right-0 px-4 z-30">
            <Button
              className="w-full max-w-lg mx-auto flex items-center justify-between h-12 rounded-2xl shadow-lg"
              onClick={() => navigate(GUEST_ROUTES.ROOM_SERVICE_CART)}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <span className="font-semibold">Review Order</span>
              </div>
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Badge>
            </Button>
          </div>
        )}
      </div>

      {/* Item detail modal */}
      <RoomServiceItemDetail
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        onAddToCart={handleAddToCart}
      />
    </GuestPageShell>
  );
}
