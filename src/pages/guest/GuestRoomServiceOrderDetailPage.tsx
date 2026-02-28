/**
 * Guest In-Villa Dining — Order Detail / Tracking
 */

import { useParams } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { UtensilsCrossed, Clock, CheckCircle2, Truck, XCircle, CircleDot } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const steps = [
  { key: 'pending', label: 'Received', icon: CircleDot },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: UtensilsCrossed },
  { key: 'delivering', label: 'On the way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

interface OrderDetail {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  room_number: string;
  special_instructions: string | null;
  estimated_delivery_minutes: number | null;
  delivered_at: string | null;
  created_at: string;
  items: { id: string; item_name: string; quantity: number; unit_price: number; special_requests: string | null }[];
}

export default function GuestRoomServiceOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { guest } = useGuestAuth();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['room-service-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_room_service_orders', {
        p_resort_id: guest!.resortId,
        p_guest_id: guest!.guestId,
      });
      if (error) throw error;
      const orders = (data as unknown as OrderDetail[]) || [];
      return orders.find(o => o.id === orderId) || null;
    },
    enabled: !!guest?.resortId && !!guest?.guestId && !!orderId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`rs-order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_service_orders',
        filter: `id=eq.${orderId}`,
      }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, refetch]);

  const currentStepIndex = order ? steps.findIndex(s => s.key === order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  return (
    <GuestPageShell>
      <div className="px-1">
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Order Details</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Order not found.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {!isCancelled ? (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {order.estimated_delivery_minutes
                        ? `Estimated ${order.estimated_delivery_minutes} min`
                        : 'Preparing your order'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {steps.map((step, idx) => {
                      const isComplete = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            isCurrent && 'ring-2 ring-primary/30'
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={cn(
                            "text-[10px] text-center leading-tight",
                            isComplete ? 'text-primary font-medium' : 'text-muted-foreground'
                          )}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive font-medium">This order was cancelled</span>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Items</h3>
                {order.items.map((item, idx) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.quantity}×</span>
                        <span className="text-sm text-foreground">{item.item_name}</span>
                      </div>
                      <span className="text-sm text-foreground">{order.currency} {(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.special_requests && (
                      <p className="text-xs text-muted-foreground ml-6 mt-0.5">"{item.special_requests}"</p>
                    )}
                    {idx < order.items.length - 1 && <Separator className="mt-2" />}
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-primary">{order.currency} {Number(order.total_amount).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room</span>
                  <span className="text-foreground font-medium">{order.room_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placed</span>
                  <span className="text-foreground">{format(parseISO(order.created_at), 'MMM d, h:mm a')}</span>
                </div>
                {order.delivered_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="text-foreground">{format(parseISO(order.delivered_at), 'h:mm a')}</span>
                  </div>
                )}
                {order.special_instructions && (
                  <div>
                    <span className="text-muted-foreground">Notes</span>
                    <p className="text-foreground mt-0.5">"{order.special_instructions}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </GuestPageShell>
  );
}
