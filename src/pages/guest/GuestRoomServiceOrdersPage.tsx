/**
 * Guest In-Villa Dining — Orders List
 */

import { useNavigate } from 'react-router-dom';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { guestPath } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  placed: { label: 'Placed', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  preparing: { label: 'Preparing', variant: 'default' },
  ready: { label: 'Ready', variant: 'default' },
  out_for_delivery: { label: 'On the way', variant: 'default' },
  delivering: { label: 'On the way', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

interface OrderSummary {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items: { item_name: string; quantity: number }[];
}

export default function GuestRoomServiceOrdersPage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['room-service-orders', guest?.resortId, guest?.guestId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_room_service_orders', {
        p_resort_id: guest!.resortId,
        p_guest_id: guest!.guestId,
      });
      if (error) throw error;
      return (data as unknown as OrderSummary[]) || [];
    },
    enabled: !!guest?.resortId && !!guest?.guestId,
    staleTime: 30_000,
  });

  return (
    <GuestPageShell>
      <div className="px-1">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">My Orders</h1>
            <p className="text-xs text-muted-foreground">In-Villa Dining</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No orders yet. Browse the menu to get started.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {orders.map(order => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              return (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(guestPath('ROOM_SERVICE_ORDER_DETAIL', { orderId: order.id }))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(order.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-foreground">
                          {order.currency} {Number(order.total_amount).toFixed(2)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {order.items.map(i => `${i.quantity}× ${i.item_name}`).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </GuestPageShell>
  );
}
