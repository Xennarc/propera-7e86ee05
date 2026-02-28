/**
 * Guest In-Villa Dining — Cart / Order Review
 */

import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { GUEST_ROUTES, guestPath } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft, CalendarClock } from 'lucide-react';
import { useRoomServiceCart, clearRoomServiceCart } from '@/hooks/useRoomServiceCart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function GuestRoomServiceCartPage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { cart, updateQuantity, removeFromCart, subtotal, clearCart } = useRoomServiceCart();
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  // Stable idempotency key: generated once per cart session to prevent double-submit
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const currency = cart[0]?.menuItem.currency || 'USD';

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!guest) throw new Error('Not logged in');
      const items = cart.map(c => ({
        item_id: c.menuItem.id,
        qty: c.quantity,
        notes: c.notes || null,
        modifiers: c.modifiers.map(m => m.id),
      }));
      const { data, error } = await supabase.rpc('room_service_create_order_idempotent' as any, {
        p_resort_id: guest.resortId,
        p_guest_id: guest.guestId,
        p_idempotency_key: idempotencyKeyRef.current,
        p_items: items as any,
        p_delivery_notes: deliveryNotes || null,
        p_allergy_notes: allergyNotes || null,
        p_scheduled_for: scheduledFor || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result: any) => {
      // Reset idempotency key for next order
      idempotencyKeyRef.current = crypto.randomUUID();
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['room-service-orders'] });
      toast({ title: 'Order placed', description: 'Your order is on its way.' });
      navigate(guestPath('ROOM_SERVICE_ORDER_DETAIL', { orderId: result.order_id }));
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not place your order. Please try again.', variant: 'destructive' });
    },
  });

  if (cart.length === 0) {
    return (
      <GuestPageShell>
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
    <GuestPageShell>
      <div className="px-1">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Review Order</h1>
        </div>

        <div className="space-y-3 pb-32">
          {cart.map(item => {
            const modExtra = item.modifiers.reduce((s, m) => s + m.price_delta, 0);
            const linePrice = (item.menuItem.price + modExtra) * item.quantity;
            return (
              <Card key={item.cartKey}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm">{item.menuItem.name}</h3>
                      {item.modifiers.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.modifiers.map(m => m.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 italic">
                          "{item.notes}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {currency} {(item.menuItem.price + modExtra).toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() =>
                          item.quantity === 1
                            ? removeFromCart(item.cartKey)
                            : updateQuantity(item.cartKey, -1)
                        }
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <span className="text-sm font-medium w-5 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.cartKey, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap w-16 text-right">
                      {currency} {linePrice.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Schedule delivery */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Schedule delivery</span>
                </div>
                {scheduledFor ? (
                  <Button variant="ghost" size="sm" onClick={() => setScheduledFor(null)} className="text-xs text-muted-foreground">
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[
                  { label: 'ASAP', value: null },
                  { label: 'In 30 min', value: 30 },
                  { label: 'In 1 hour', value: 60 },
                  { label: 'In 2 hours', value: 120 },
                ].map(opt => {
                  const isSelected = opt.value === null ? !scheduledFor : false;
                  const optValue = opt.value ? new Date(Date.now() + opt.value * 60_000).toISOString() : null;
                  const isThisSelected = opt.value === null ? !scheduledFor : scheduledFor === optValue;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setScheduledFor(opt.value ? new Date(Date.now() + opt.value * 60_000).toISOString() : null)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        (opt.value === null && !scheduledFor)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                ⚠️ Allergy notes
              </label>
              <Textarea
                value={allergyNotes}
                onChange={e => setAllergyNotes(e.target.value)}
                placeholder="e.g. Nut allergy, gluten free..."
                className="resize-none text-base mt-1 border-destructive/20 focus-visible:border-destructive/40"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Delivery notes</label>
              <Textarea
                value={deliveryNotes}
                onChange={e => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Ring doorbell, leave at door, extra cutlery..."
                className="resize-none text-base mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Total */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm text-foreground">{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">Service charge</span>
                <span className="text-sm text-foreground">{currency} 0.00</span>
              </div>
              <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{currency} {subtotal.toFixed(2)}</span>
              </div>
              <Badge variant="outline" className="mt-2 text-[11px]">
                Charged to room
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Fixed bottom actions */}
        <div className="fixed bottom-[calc(var(--guest-nav-h,68px)+env(safe-area-inset-bottom,0px)+12px)] left-0 right-0 px-4 z-30 space-y-2">
          <Button
            className="w-full max-w-lg mx-auto h-12 rounded-2xl shadow-lg text-base font-semibold"
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
      </div>
    </GuestPageShell>
  );
}
