/**
 * Staff Room Service Orders — Ops Board
 *
 * Status-segmented tabs with quick actions, allergy badges,
 * realtime via useRealtimeSubscription, RPC-based status transitions.
 * Includes SLA aging indicators and new-order toast notifications.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useResortScope } from '@/hooks/sync/useResortScope';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription, createResortFilter } from '@/hooks/sync/useRealtimeSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  UtensilsCrossed,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  Timer,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/FeatureGate';

// ── Status config ──────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'placed',           label: 'New',        icon: UtensilsCrossed, variant: 'secondary' as const },
  { key: 'confirmed',        label: 'Confirmed',  icon: CheckCircle2,    variant: 'default' as const },
  { key: 'preparing',        label: 'Preparing',  icon: ChefHat,         variant: 'default' as const },
  { key: 'ready',            label: 'Ready',       icon: PackageCheck,    variant: 'default' as const },
  { key: 'out_for_delivery', label: 'Delivering', icon: Truck,           variant: 'default' as const },
  { key: 'done',             label: 'Done',        icon: CheckCircle2,    variant: 'outline' as const },
] as const;

const QUICK_ACTIONS: Record<string, { next: string; label: string }> = {
  placed:           { next: 'confirmed',        label: 'Confirm' },
  confirmed:        { next: 'preparing',        label: 'Start prep' },
  preparing:        { next: 'ready',            label: 'Mark ready' },
  ready:            { next: 'out_for_delivery', label: 'Send out' },
  out_for_delivery: { next: 'delivered',        label: 'Delivered' },
};

interface OrderRow {
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

/** Returns age badge color class based on minutes since placed */
function getAgeBadge(minutes: number): { label: string; className: string } | null {
  if (minutes < 5) return null; // Too fresh, no badge
  if (minutes < 15) return { label: `${minutes}m`, className: 'bg-muted text-muted-foreground' };
  if (minutes < 30) return { label: `${minutes}m`, className: 'bg-accent text-accent-foreground' };
  return { label: `${minutes}m`, className: 'bg-destructive/15 text-destructive' };
}

function StaffRoomServiceOrdersContent() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const { resortId } = useResortScope();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('placed');

  // Track known order IDs to detect new orders for toast
  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const queryKey = ['staff-rs-orders', resortId];

  const { data: orders, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_orders')
        .select('id, status, total_amount, currency, room_number, villa_label, allergy_notes, delivery_notes, promised_at, created_at, placed_at, guests(first_name, last_name), room_service_order_items(id)')
        .eq('resort_id', currentResort!.id)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as unknown as OrderRow[];
    },
    enabled: !!currentResort?.id,
    staleTime: 10_000,
  });

  // Detect new placed orders and show toast
  useEffect(() => {
    if (!orders) return;
    
    if (!initialLoadDone.current) {
      // Seed known IDs on first load — no toast
      orders.forEach(o => knownOrderIds.current.add(o.id));
      initialLoadDone.current = true;
      return;
    }

    for (const order of orders) {
      if (!knownOrderIds.current.has(order.id) && order.status === 'placed') {
        const villa = order.villa_label || order.room_number;
        toast({
          title: '🍽️ New room service order',
          description: `${villa} just placed an order`,
        });
      }
      knownOrderIds.current.add(order.id);
    }
  }, [orders, toast]);

  // Realtime
  useRealtimeSubscription({
    channelKey: `staff-rs-board-${resortId}`,
    tables: [
      { table: 'room_service_orders', filter: createResortFilter(resortId!), event: '*' },
      { table: 'room_service_status_events', filter: createResortFilter(resortId!), event: 'INSERT' },
    ],
    onChange: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    enabled: !!resortId,
  });

  // Quick status action
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
      toast({ title: 'Status updated' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to update',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Group orders by status
  const grouped = useMemo(() => {
    const map: Record<string, OrderRow[]> = {
      placed: [],
      confirmed: [],
      preparing: [],
      ready: [],
      out_for_delivery: [],
      done: [],
    };
    for (const o of orders || []) {
      if (o.status === 'delivered' || o.status === 'cancelled') {
        map.done.push(o);
      } else if (map[o.status]) {
        map[o.status].push(o);
      } else {
        map.placed.push(o);
      }
    }
    return map;
  }, [orders]);

  // Counts for tab badges
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const key of Object.keys(grouped)) {
      c[key] = grouped[key].length;
    }
    return c;
  }, [grouped]);

  const displayOrders = grouped[tab] || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Service Orders</h1>
          <p className="text-sm text-muted-foreground">Manage in-villa dining orders</p>
        </div>
        {counts.placed > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1 animate-pulse">
            {counts.placed} new
          </Badge>
        )}
      </div>

      {/* Status tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          {STATUS_TABS.map(st => {
            const count = counts[st.key] || 0;
            return (
              <TabsTrigger
                key={st.key}
                value={st.key}
                className={cn(
                  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                  'gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border',
                  'data-[state=inactive]:bg-muted/40',
                )}
              >
                <st.icon className="h-3 w-3" />
                {st.label}
                {count > 0 && (
                  <span className="ml-0.5 text-[10px] font-bold">{count}</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : displayOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No orders in this status
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {displayOrders.map(order => {
                const guest = order.guests;
                const guestName = guest
                  ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Guest'
                  : 'Guest';
                const villa = order.villa_label || order.room_number;
                const itemCount = order.room_service_order_items?.length || 0;
                const hasAllergy = !!order.allergy_notes;
                const action = QUICK_ACTIONS[order.status];
                const placedTime = order.placed_at || order.created_at;

                // SLA age indicator
                const ageMinutes = differenceInMinutes(new Date(), parseISO(placedTime));
                const ageBadge = tab !== 'done' ? getAgeBadge(ageMinutes) : null;

                return (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() =>
                      navigate(`/staff/room-service/orders/${order.id}`)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">
                              {villa}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {guestName}
                            </span>
                            {hasAllergy && (
                              <Badge
                                variant="destructive"
                                className="text-[9px] gap-0.5 px-1.5 py-0"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Allergy
                              </Badge>
                            )}
                            {ageBadge && (
                              <span className={cn(
                                'inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0 rounded-full',
                                ageBadge.className,
                              )}>
                                <Timer className="h-2.5 w-2.5" />
                                {ageBadge.label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(parseISO(placedTime), {
                              addSuffix: true,
                            })}
                            <span>·</span>
                            <span>
                              {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                            <span>·</span>
                            <span className="font-medium text-foreground">
                              {order.currency}{' '}
                              {Number(order.total_amount).toFixed(2)}
                            </span>
                          </div>

                          {order.promised_at && (
                            <p className="text-[11px] text-muted-foreground">
                              ETA{' '}
                              {format(parseISO(order.promised_at), 'h:mm a')}
                            </p>
                          )}
                        </div>

                        {/* Right: quick action + chevron */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {action && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2.5"
                              disabled={statusMutation.isPending}
                              onClick={e => {
                                e.stopPropagation();
                                statusMutation.mutate({
                                  orderId: order.id,
                                  newStatus: action.next,
                                });
                              }}
                            >
                              {action.label}
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
