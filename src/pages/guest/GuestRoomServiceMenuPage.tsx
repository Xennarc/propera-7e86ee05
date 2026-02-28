/**
 * Guest In-Villa Dining — Menu Browser
 * 
 * Displays the room service menu grouped by category.
 * Guests can add items to a local cart and proceed to review.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UtensilsCrossed, Plus, Minus, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  dietary_tags: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  items: MenuItem[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialRequests?: string;
}

// Simple in-memory cart (shared via sessionStorage for cross-page persistence)
function getCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem('rs_cart');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setCart(items: CartItem[]) {
  sessionStorage.setItem('rs_cart', JSON.stringify(items));
}

export default function GuestRoomServiceMenuPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [cart, setCartState] = useState<CartItem[]>(getCart);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['room-service-menu', guest?.resort_id, guest?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_room_service_menu', {
        p_resort_id: guest!.resort_id,
        p_guest_id: guest!.id,
      });
      if (error) throw error;
      return (data as MenuCategory[]) || [];
    },
    enabled: !!guest?.resort_id && !!guest?.id,
    staleTime: 5 * 60 * 1000,
  });

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const updateCart = (menuItem: MenuItem, delta: number) => {
    setCartState(prev => {
      const existing = prev.find(c => c.menuItem.id === menuItem.id);
      let next: CartItem[];
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          next = prev.filter(c => c.menuItem.id !== menuItem.id);
        } else {
          next = prev.map(c => c.menuItem.id === menuItem.id ? { ...c, quantity: newQty } : c);
        }
      } else if (delta > 0) {
        next = [...prev, { menuItem, quantity: 1 }];
      } else {
        next = prev;
      }
      setCart(next);
      return next;
    });
  };

  const getItemQty = (id: string) => cart.find(c => c.menuItem.id === id)?.quantity || 0;

  return (
    <GuestPageShell
      title="In-Villa Dining"
      subtitle="Delivered to your door"
      icon={<UtensilsCrossed className="h-5 w-5" />}
    >
      {isLoading ? (
        <div className="space-y-6 px-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">The menu is being prepared. Please check back shortly.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-24">
          {categories.map(cat => (
            <section key={cat.id}>
              <h2 className="text-lg font-semibold text-foreground mb-1">{cat.name}</h2>
              {cat.description && (
                <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>
              )}
              <div className="space-y-3">
                {cat.items.map(item => {
                  const qty = getItemQty(item.id);
                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4 flex gap-3">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-foreground leading-tight">{item.name}</h3>
                            <span className="text-sm font-semibold text-primary whitespace-nowrap">
                              {item.currency} {Number(item.price).toFixed(2)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                          )}
                          {item.dietary_tags?.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {item.dietary_tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-end mt-2 gap-2">
                            {qty > 0 ? (
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCart(item, -1)}>
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-sm font-medium w-5 text-center">{qty}</span>
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCart(item, 1)}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateCart(item, 1)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-[calc(var(--guest-nav-h,68px)+env(safe-area-inset-bottom,0px)+12px)] left-0 right-0 px-4 z-30">
          <Button
            className="w-full max-w-lg mx-auto flex items-center justify-between h-12 rounded-2xl shadow-lg"
            onClick={() => navigate(GUEST_ROUTES.ROOM_SERVICE_CART)}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Review Order</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </Badge>
          </Button>
        </div>
      )}
    </GuestPageShell>
  );
}
