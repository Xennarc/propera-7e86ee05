/**
 * Staff Room Service — Order Detail with status management
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { UtensilsCrossed, ArrowLeft, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FeatureGate } from '@/components/FeatureGate';
import { useEffect } from 'react';

const statusFlow: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'delivered',
};

const statusActions: Record<string, string> = {
  pending: 'Confirm Order',
  confirmed: 'Start Preparing',
  preparing: 'Mark as Delivering',
  delivering: 'Mark as Delivered',
};

function StaffRoomServiceOrderDetailContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['staff-rs-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_orders')
        .select('*, room_service_order_items(*), guests(first_name, last_name)')
        .eq('id', orderId!)
        .eq('resort_id', currentResort!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!currentResort?.id,
  });

  // Realtime
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`staff-rs-order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_service_orders',
        filter: `id=eq.${orderId}`,
      }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, refetch]);

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
      if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString();

      const { error } = await supabase
        .from('room_service_orders')
        .update(updates)
        .eq('id', orderId!)
        .eq('resort_id', currentResort!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-rs-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['staff-rs-orders'] });
      toast({ title: 'Status updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not update order status.', variant: 'destructive' });
    },
  });

  const guest = (order?.guests as any);
  const guestName = guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Guest';
  const items = (order?.room_service_order_items as any[]) || [];
  const nextStatus = order ? statusFlow[order.status] : null;
  const nextAction = order ? statusActions[order.status] : null;
  const canCancel = order && ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/staff/room-service/orders')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to orders
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : !order ? (
        <p className="text-muted-foreground">Order not found.</p>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">Order for {guestName}</h1>
              <p className="text-sm text-muted-foreground">
                Room {order.room_number} · {format(parseISO(order.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
            <Badge
              variant={order.status === 'cancelled' ? 'destructive' : order.status === 'delivered' ? 'outline' : 'default'}
              className="text-sm px-3 py-1"
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item: any, idx: number) => (
                <div key={item.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-foreground">{item.quantity}× {item.item_name}</span>
                      {item.special_requests && (
                        <p className="text-xs text-muted-foreground mt-0.5">"{item.special_requests}"</p>
                      )}
                    </div>
                    <span className="text-sm text-foreground">
                      {order.currency} {(Number(item.unit_price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  {idx < items.length - 1 && <Separator className="mt-2" />}
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{order.currency} {Number(order.total_amount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {order.special_instructions && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">Special Instructions</h3>
                <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {(nextAction || canCancel) && (
            <div className="flex gap-3">
              {nextAction && (
                <Button
                  className="flex-1"
                  onClick={() => updateStatus.mutate(nextStatus!)}
                  disabled={updateStatus.isPending}
                >
                  {nextAction}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={() => updateStatus.mutate('cancelled')}
                  disabled={updateStatus.isPending}
                >
                  Cancel Order
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StaffRoomServiceOrderDetailPage() {
  return (
    <FeatureGate requiredFlags={['enable_room_service']} mode="staff">
      <StaffRoomServiceOrderDetailContent />
    </FeatureGate>
  );
}
