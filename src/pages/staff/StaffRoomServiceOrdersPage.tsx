/**
 * Staff Room Service Orders — List View
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, ChevronRight, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/FeatureGate';
import { useEffect } from 'react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  preparing: { label: 'Preparing', variant: 'default' },
  delivering: { label: 'Delivering', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

function StaffRoomServiceOrdersContent() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['staff-rs-orders', currentResort?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_orders')
        .select('*, room_service_order_items(*), guests(first_name, last_name)')
        .eq('resort_id', currentResort!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort?.id,
    staleTime: 15_000,
  });

  // Realtime updates
  useEffect(() => {
    if (!currentResort?.id) return;
    const channel = supabase
      .channel('staff-rs-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_service_orders',
        filter: `resort_id=eq.${currentResort.id}`,
      }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentResort?.id, refetch]);

  const activeStatuses = ['pending', 'confirmed', 'preparing', 'delivering'];
  const activeOrders = orders?.filter(o => activeStatuses.includes(o.status)) || [];
  const completedOrders = orders?.filter(o => !activeStatuses.includes(o.status)) || [];

  const displayOrders = tab === 'active' ? activeOrders : completedOrders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Service Orders</h1>
          <p className="text-sm text-muted-foreground">Manage in-villa dining orders</p>
        </div>
        {activeOrders.length > 0 && (
          <Badge variant="default" className="text-sm px-3 py-1">
            {activeOrders.length} active
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'completed')}>
        <TabsList>
          <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : displayOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  {tab === 'active' ? 'No active orders' : 'No completed orders'}
                </p>
              </CardContent>
            </Card>
          ) : (
            displayOrders.map(order => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              const guest = order.guests as any;
              const guestName = guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Guest';
              const itemCount = (order.room_service_order_items as any[])?.length || 0;
              return (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/staff/room-service/orders/${order.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{guestName}</span>
                          <Badge variant="outline" className="text-[10px]">Room {order.room_number}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {itemCount} item{itemCount !== 1 ? 's' : ''} · {order.currency} {Number(order.total_amount).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(order.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StaffRoomServiceOrdersPage() {
  return (
    <FeatureGate requiredFlags={['enable_room_service']} mode="staff">
      <StaffRoomServiceOrdersContent />
    </FeatureGate>
  );
}
