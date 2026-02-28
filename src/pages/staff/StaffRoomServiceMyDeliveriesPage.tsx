/**
 * Staff "My Deliveries" — runner-specific view.
 *
 * Shows orders assigned to the current staff user with status
 * ready or out_for_delivery. Quick buttons: Picked up → Delivered.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useResortScope } from '@/hooks/sync/useResortScope';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription, createResortFilter } from '@/hooks/sync/useRealtimeSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Truck,
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/FeatureGate';

interface DeliveryOrder {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  room_number: string;
  villa_label: string | null;
  allergy_notes: string | null;
  delivery_notes: string | null;
  promised_at: string | null;
  created_at: string;
  placed_at: string | null;
  guests: { first_name: string | null; last_name: string | null } | null;
  room_service_order_items: { id: string }[];
}

function StaffMyDeliveriesContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentResort } = useResort();
  const { resortId } = useResortScope();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['staff-rs-my-deliveries', resortId, user?.id];

  const { data: orders = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_orders')
        .select('id, status, total_amount, currency, room_number, villa_label, allergy_notes, delivery_notes, promised_at, created_at, placed_at, guests(first_name, last_name), room_service_order_items(id)')
        .eq('resort_id', currentResort!.id)
        .eq('assigned_runner_staff_id', user!.id)
        .in('status', ['ready', 'out_for_delivery'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DeliveryOrder[];
    },
    enabled: !!currentResort?.id && !!user?.id,
    staleTime: 5_000,
  });

  // Realtime
  useRealtimeSubscription({
    channelKey: `staff-rs-my-deliveries-${user?.id}`,
    tables: [
      { table: 'room_service_orders', filter: createResortFilter(resortId!), event: '*' },
    ],
    onChange: () => {
      queryClient.invalidateQueries({ queryKey });
      // Also refresh the board if open in another tab
      queryClient.invalidateQueries({ queryKey: ['staff-rs-orders'] });
    },
    enabled: !!resortId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase.rpc('room_service_set_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_message: null,
        p_promised_at: null,
        p_assigned_runner_staff_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['staff-rs-orders'] });
      toast({ title: 'Status updated' });
    },
    onError: (err: any) => {
      toast({
        title: 'Update failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const readyOrders = useMemo(() => orders.filter(o => o.status === 'ready'), [orders]);
  const enRouteOrders = useMemo(() => orders.filter(o => o.status === 'out_for_delivery'), [orders]);

  const renderOrder = (order: DeliveryOrder) => {
    const guest = order.guests;
    const guestName = guest
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Guest'
      : 'Guest';
    const villa = order.villa_label || order.room_number;
    const itemCount = order.room_service_order_items?.length || 0;
    const hasAllergy = !!order.allergy_notes;
    const placedTime = order.placed_at || order.created_at;
    const isReady = order.status === 'ready';

    return (
      <Card
        key={order.id}
        className="cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => navigate(`/staff/room-service/orders/${order.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-sm">{villa}</span>
                <span className="text-xs text-muted-foreground">{guestName}</span>
                {hasAllergy && (
                  <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0">
                    <AlertTriangle className="h-2.5 w-2.5" /> Allergy
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(parseISO(placedTime), { addSuffix: true })}
                <span>·</span>
                <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span className="font-medium text-foreground">
                  {order.currency} {Number(order.total_amount).toFixed(2)}
                </span>
              </div>
              {order.delivery_notes && (
                <p className="text-[11px] text-muted-foreground italic truncate">
                  "{order.delivery_notes}"
                </p>
              )}
              {order.promised_at && (
                <p className="text-[11px] text-muted-foreground">
                  ETA {format(parseISO(order.promised_at), 'h:mm a')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant={isReady ? 'outline' : 'default'}
                className="text-xs h-8 gap-1.5"
                disabled={statusMutation.isPending}
                onClick={e => {
                  e.stopPropagation();
                  statusMutation.mutate({
                    orderId: order.id,
                    newStatus: isReady ? 'out_for_delivery' : 'delivered',
                  });
                }}
              >
                {isReady ? (
                  <><Truck className="h-3.5 w-3.5" /> Picked up</>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Delivered</>
                )}
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Deliveries</h1>
        <p className="text-sm text-muted-foreground">Orders assigned to you for delivery</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No deliveries assigned to you right now</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {readyOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">Ready for pickup</h2>
                <Badge variant="secondary" className="text-[10px]">{readyOrders.length}</Badge>
              </div>
              {readyOrders.map(renderOrder)}
            </div>
          )}

          {enRouteOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">En route</h2>
                <Badge variant="secondary" className="text-[10px]">{enRouteOrders.length}</Badge>
              </div>
              {enRouteOrders.map(renderOrder)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StaffRoomServiceMyDeliveriesPage() {
  return (
    <FeatureGate requiredFlags={['enable_room_service']} mode="staff">
      <StaffMyDeliveriesContent />
    </FeatureGate>
  );
}
