/**
 * Guest In-Villa Dining — Order Tracking
 *
 * Premium tracking experience with:
 * - Large status timeline (vertical)
 * - ETA / promised_at display
 * - Realtime subscriptions (orders + status_events)
 * - Reorder button
 * - Subtle themed toast on status change
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRoomServiceCart } from '@/hooks/useRoomServiceCart';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  CircleDot,
  ChefHat,
  PackageCheck,
  RotateCcw,
  CalendarClock,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Timeline steps ─────────────────────────────────────────────
const STEPS = [
  { key: 'placed',           label: 'Placed',       icon: CircleDot },
  { key: 'confirmed',        label: 'Confirmed',    icon: CheckCircle2 },
  { key: 'preparing',        label: 'Preparing',    icon: ChefHat },
  { key: 'ready',            label: 'Ready',        icon: PackageCheck },
  { key: 'out_for_delivery', label: 'On the way',   icon: Truck },
  { key: 'delivered',        label: 'Delivered',     icon: CheckCircle2 },
] as const;

// ── Types ──────────────────────────────────────────────────────
interface OrderItemModifier {
  id: string;
  name: string;
  price_delta: number;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  special_requests: string | null;
  modifiers: OrderItemModifier[];
}

interface StatusEvent {
  id: string;
  old_status: string | null;
  new_status: string;
  message: string | null;
  actor_type: string;
  created_at: string;
}

interface OrderDetailData {
  id: string;
  status: string;
  total_amount: number;
  subtotal: number;
  service_charge: number;
  tax: number;
  currency: string;
  room_number: string;
  special_instructions: string | null;
  delivery_notes: string | null;
  allergy_notes: string | null;
  estimated_delivery_minutes: number | null;
  promised_at: string | null;
  scheduled_for: string | null;
  placed_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  payment_method: string;
  items: OrderItem[];
  status_events: StatusEvent[];
}

// ── Status helpers ─────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for delivery',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function GuestRoomServiceOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addToCart } = useRoomServiceCart();
  const prevStatusRef = useRef<string | null>(null);

  // ── Query ────────────────────────────────────────────────────
  const queryKey = ['room-service-order-detail', orderId];

  const { data: order, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_room_service_order_detail', {
        p_resort_id: guest!.resortId,
        p_guest_id: guest!.guestId,
        p_order_id: orderId!,
      });
      if (error) throw error;
      return data as unknown as OrderDetailData;
    },
    enabled: !!guest?.resortId && !!guest?.guestId && !!orderId,
    staleTime: 10_000,
  });

  // ── Realtime subscriptions ───────────────────────────────────
  useEffect(() => {
    if (!orderId || !guest?.resortId) return;

    const channel = supabase
      .channel(`rs-track-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_service_orders',
        filter: `id=eq.${orderId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['room-service-orders'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_service_status_events',
        filter: `order_id=eq.${orderId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, guest?.resortId, queryClient, queryKey]);

  // ── Toast on status change ───────────────────────────────────
  useEffect(() => {
    if (!order) return;
    const prev = prevStatusRef.current;
    if (prev && prev !== order.status) {
      const label = STATUS_LABELS[order.status] || order.status;
      toast({
        title: `Order ${label.toLowerCase()}`,
        description: order.status === 'delivered'
          ? 'Enjoy your meal!'
          : `Your order is now ${label.toLowerCase()}.`,
        duration: 4000,
      });
    }
    prevStatusRef.current = order.status;
  }, [order?.status, toast]);

  // ── Reorder handler ──────────────────────────────────────────
  const handleReorder = useCallback(() => {
    if (!order) return;
    for (const item of order.items) {
      const modifiers = item.modifiers.map(m => ({
        id: m.id,
        name: m.name,
        price_delta: m.price_delta,
      }));
      addToCart(
        {
          id: item.menu_item_id,
          name: item.item_name,
          description: null,
          price: Number(item.unit_price),
          currency: order.currency,
          image_url: null,
          dietary_tags: null,
          allergens: null,
          tags: null,
          prep_time_minutes: null,
          is_featured: false,
          is_available: true,
          category_id: '',
          sort_order: 0,
        },
        item.quantity,
        modifiers,
        item.notes || item.special_requests || undefined,
      );
    }
    toast({ title: 'Items added to cart', description: 'Review your order before placing.' });
    navigate(GUEST_ROUTES.ROOM_SERVICE_CART);
  }, [order, addToCart, navigate, toast]);

  // ── Derived ──────────────────────────────────────────────────
  const currentStepIndex = order
    ? STEPS.findIndex(s => s.key === order.status)
    : -1;
  const isCancelled = order?.status === 'cancelled';
  const isDelivered = order?.status === 'delivered';

  return (
    <GuestPageShell>
      <div className="px-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Order Tracking</h1>
          </div>
          {order && (isDelivered || isCancelled) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleReorder}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reorder
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Order not found.</p>
          </div>
        ) : (
          <div className="space-y-5 pb-8">
            {/* ── ETA / Status hero ────────────────────────── */}
            {!isCancelled && (
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  {/* ETA banner */}
                  {!isDelivered && (
                    <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5 rounded-lg bg-muted/40">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground">
                        {order.promised_at ? (
                          <>
                            Arriving by{' '}
                            <span className="font-semibold">
                              {format(parseISO(order.promised_at), 'h:mm a')}
                            </span>
                          </>
                        ) : order.estimated_delivery_minutes ? (
                          `Estimated ${order.estimated_delivery_minutes} min`
                        ) : (
                          'We\'re working on your order'
                        )}
                      </span>
                    </div>
                  )}

                  {isDelivered && (
                    <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5 rounded-lg bg-primary/5">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground font-medium">
                        Delivered{' '}
                        {order.delivered_at && (
                          <span className="font-normal text-muted-foreground">
                            · {formatDistanceToNow(parseISO(order.delivered_at), { addSuffix: true })}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* ── Vertical timeline ──────────────────── */}
                  <div className="relative pl-6">
                    {/* Vertical line */}
                    <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />

                    {STEPS.map((step, idx) => {
                      const isComplete = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;
                      const isPast = idx < currentStepIndex;
                      const Icon = step.icon;

                      // Find matching status event for timestamp
                      const event = order.status_events.find(
                        e => e.new_status === step.key,
                      );

                      return (
                        <div
                          key={step.key}
                          className={cn(
                            'relative flex items-start gap-3 pb-5 last:pb-0',
                            !isComplete && 'opacity-40',
                          )}
                        >
                          {/* Node */}
                          <div
                            className={cn(
                              'absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all z-10',
                              isComplete
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground border border-border',
                              isCurrent && 'ring-[3px] ring-primary/20 scale-110',
                            )}
                          >
                            <Icon className="h-3 w-3" />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 pt-0.5">
                            <p
                              className={cn(
                                'text-sm leading-tight',
                                isCurrent
                                  ? 'font-semibold text-foreground'
                                  : isComplete
                                  ? 'font-medium text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {step.label}
                            </p>
                            {event && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {format(parseISO(event.created_at), 'h:mm a')}
                                {event.message && (
                                  <span className="ml-1.5">· {event.message}</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Cancelled state ──────────────────────────── */}
            {isCancelled && (
              <Card className="border-destructive/20">
                <CardContent className="p-5 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Order cancelled
                    </p>
                    {order.cancel_reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.cancel_reason}
                      </p>
                    )}
                    {order.cancelled_at && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(parseISO(order.cancelled_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Scheduled delivery ───────────────────────── */}
            {order.scheduled_for && !isDelivered && !isCancelled && (
              <div className="flex items-center gap-2 px-1">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Scheduled for{' '}
                  <span className="font-medium text-foreground">
                    {format(parseISO(order.scheduled_for), 'h:mm a')}
                  </span>
                </span>
              </div>
            )}

            {/* ── Items summary ─────────────────────────────── */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Your items
                </h3>
                {order.items.map((item, idx) => {
                  const modTotal = item.modifiers.reduce(
                    (s, m) => s + Number(m.price_delta),
                    0,
                  );
                  const lineTotal =
                    (Number(item.unit_price) + modTotal) * item.quantity;

                  return (
                    <div key={item.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              {item.quantity}×
                            </span>
                            <span className="text-sm text-foreground">
                              {item.item_name}
                            </span>
                          </div>
                          {item.modifiers.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">
                              {item.modifiers.map(m => m.name).join(', ')}
                            </p>
                          )}
                          {(item.notes || item.special_requests) && (
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5 ml-6 italic">
                              "{item.notes || item.special_requests}"
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-foreground whitespace-nowrap">
                          {order.currency} {lineTotal.toFixed(2)}
                        </span>
                      </div>
                      {idx < order.items.length - 1 && (
                        <Separator className="mt-2.5" />
                      )}
                    </div>
                  );
                })}
                <Separator />
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">
                      {order.currency} {Number(order.subtotal).toFixed(2)}
                    </span>
                  </div>
                  {Number(order.service_charge) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service charge</span>
                      <span className="text-foreground">
                        {order.currency}{' '}
                        {Number(order.service_charge).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {Number(order.tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-foreground">
                        {order.currency} {Number(order.tax).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-border">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {order.currency} {Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Order info ────────────────────────────────── */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Villa / Room</span>
                  <span className="text-foreground font-medium">
                    {order.room_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placed</span>
                  <span className="text-foreground">
                    {format(parseISO(order.placed_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                {order.delivered_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="text-foreground">
                      {format(parseISO(order.delivered_at), 'h:mm a')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant="outline" className="text-[10px]">
                    {order.payment_method === 'room_charge'
                      ? 'Charged to room'
                      : order.payment_method}
                  </Badge>
                </div>
                {order.delivery_notes && (
                  <div className="pt-1">
                    <span className="text-muted-foreground">Delivery notes</span>
                    <p className="text-foreground mt-0.5">
                      "{order.delivery_notes}"
                    </p>
                  </div>
                )}
                {order.allergy_notes && (
                  <div className="pt-1">
                    <span className="text-muted-foreground">Allergy notes</span>
                    <p className="text-foreground mt-0.5">
                      "{order.allergy_notes}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Reorder CTA (for completed orders) ──────── */}
            {(isDelivered || isCancelled) && (
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  className="w-full h-11 rounded-xl gap-2"
                  onClick={handleReorder}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reorder
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate(GUEST_ROUTES.ROOM_SERVICE_ORDERS)}
                >
                  View all orders
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </GuestPageShell>
  );
}
