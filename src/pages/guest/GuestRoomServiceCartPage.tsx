/**
 * Guest In-Villa Dining — Cart / Order Review
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { GUEST_ROUTES, guestPath } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { CartItem } from './GuestRoomServiceMenuPage';

function getCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem('rs_cart');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveCart(items: CartItem[]) {
  sessionStorage.setItem('rs_cart', JSON.stringify(items));
}
function clearCart() {
  sessionStorage.removeItem('rs_cart');
}

export default function GuestRoomServiceCartPage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>(getCart);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const total = useMemo(() => cart.reduce((s, i) => s + Number(i.menuItem.price) * i.quantity, 0), [cart]);
  const currency = cart[0]?.menuItem.currency || 'USD';

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const next = prev.map(c => {
        if (c.menuItem.id !== id) return c;
        const newQty = c.quantity + delta;
        return newQty <= 0 ? null : { ...c, quantity: newQty };
      }).filter(Boolean) as CartItem[];
      saveCart(next);
      return next;
    });
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!guest) throw new Error('Not logged in');
      const items = cart.map(c => ({
        menu_item_id: c.menuItem.id,
        quantity: c.quantity,
        special_requests: c.specialRequests || null,
      }));
      const { data, error } = await supabase.rpc('guest_place_room_service_order', {
        p_resort_id: guest.resort_id,
        p_guest_id: guest.id,
        p_room_number: guest.room_number || '',
        p_items: items as any,
        p_special_instructions: specialInstructions || null,
        p_stay_id: null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (orderId) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['room-service-orders'] });
      toast({ title: 'Order placed', description: 'Your order is on its way.' });
      navigate(guestPath('ROOM_SERVICE_ORDER_DETAIL', { orderId }));
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not place your order. Please try again.', variant: 'destructive' });
    },
  });

  if (cart.length === 0) {
    return (
      <GuestPageShell title="Your Order" icon={<ShoppingBag className="h-5 w-5" />}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button variant="outline" onClick={() => navigate(GUEST_ROUTES.ROOM_SERVICE)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Browse Menu
          </Button>
        </div>
      </GuestPageShell>
    );
  }

  return (
    <GuestPageShell title="Review Order" icon={<ShoppingBag className="h-5 w-5" />}>
      <div className="space-y-4 pb-32">
        {cart.map(item => (
          <Card key={item.menuItem.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-sm">{item.menuItem.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {currency} {Number(item.menuItem.price).toFixed(2)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(item.menuItem.id, -1)}>
                  {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5" />}
                </Button>
                <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(item.menuItem.id, 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap w-16 text-right">
                {currency} {(Number(item.menuItem.price) * item.quantity).toFixed(2)}
              </span>
            </CardContent>
          </Card>
        ))}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Special instructions</label>
          <Textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Allergies, preferences, delivery time..."
            className="resize-none"
            rows={3}
          />
        </div>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">{currency} {total.toFixed(2)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-[calc(var(--guest-nav-h,68px)+env(safe-area-inset-bottom,0px)+12px)] left-0 right-0 px-4 z-30 space-y-2">
        <Button
          className="w-full max-w-lg mx-auto h-12 rounded-2xl shadow-lg"
          onClick={() => placeOrder.mutate()}
          disabled={placeOrder.isPending}
        >
          {placeOrder.isPending ? 'Placing order…' : 'Place Order'}
        </Button>
        <Button
          variant="ghost"
          className="w-full max-w-lg mx-auto"
          onClick={() => navigate(GUEST_ROUTES.ROOM_SERVICE)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Add more items
        </Button>
      </div>
    </GuestPageShell>
  );
}
