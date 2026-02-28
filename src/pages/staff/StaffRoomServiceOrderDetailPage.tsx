/**
 * Staff Room Service — Order Detail / Ticket View
 *
 * Ticket-style layout with:
 * - Allergy notes pinned at top
 * - Items with modifiers and per-item notes
 * - ETA / promised_at setter
 * - Runner assignment
 * - Status action buttons via room_service_set_status RPC
 * - Internal message on status event
 * - Realtime via useRealtimeSubscription
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useResortScope } from '@/hooks/sync/useResortScope';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription, createFilter } from '@/hooks/sync/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  CircleDot,
  Send,
  UserRound,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/FeatureGate';

// ── Status flow ────────────────────────────────────────────────
const STATUS_ACTIONS: { status: string; next: string; label: string; icon: React.ElementType; variant?: 'default' | 'destructive' }[] = [
  { status: 'placed',           next: 'confirmed',        label: 'Confirm Order',   icon: CheckCircle2 },
  { status: 'confirmed',        next: 'preparing',        label: 'Start Preparing', icon: ChefHat },
  { status: 'preparing',        next: 'ready',            label: 'Mark Ready',      icon: PackageCheck },
  { status: 'ready',            next: 'out_for_delivery', label: 'Send Out',        icon: Truck },
  { status: 'out_for_delivery', next: 'delivered',        label: 'Mark Delivered',  icon: CheckCircle2 },
];

const CAN_CANCEL = ['placed', 'confirmed', 'preparing'];

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Delivering',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const TIMELINE_STEPS = [
  { key: 'placed',           label: 'Placed',     icon: CircleDot },
  { key: 'confirmed',        label: 'Confirmed',  icon: CheckCircle2 },
  { key: 'preparing',        label: 'Preparing',  icon: ChefHat },
  { key: 'ready',            label: 'Ready',      icon: PackageCheck },
  { key: 'out_for_delivery', label: 'On the way', icon: Truck },
  { key: 'delivered',        label: 'Delivered',  icon: CheckCircle2 },
];

// ── Types ──────────────────────────────────────────────────────
interface OrderModifier {
  id: string;
  name_snapshot: string;
  price_delta_snapshot: number;
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  special_requests: string | null;
  room_service_order_item_modifiers: OrderModifier[];
}

interface StatusEvent {
  id: string;
  old_status: string | null;
  new_status: string;
  message: string | null;
  actor_type: string;
  created_at: string;
}

interface StaffMember {
  user_id: string;
  full_name: string;
}

function StaffRoomServiceOrderDetailContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const { resortId } = useResortScope();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [internalMsg, setInternalMsg] = useState('');
  const [promisedInput, setPromisedInput] = useState('');
  const [selectedRunner, setSelectedRunner] = useState<string>('');

  const orderQueryKey = ['staff-rs-order-detail', orderId];

  // ── Order data ───────────────────────────────────────────────
  const { data: order, isLoading } = useQuery({
    queryKey: orderQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_orders')
        .select(`
          *,
          guests(first_name, last_name),
          room_service_order_items(
            id, item_name, quantity, unit_price, notes, special_requests,
            room_service_order_item_modifiers(id, name_snapshot, price_delta_snapshot)
          )
        `)
        .eq('id', orderId!)
        .eq('resort_id', currentResort!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!currentResort?.id,
  });

  // ── Status events ────────────────────────────────────────────
  const { data: events = [] } = useQuery({
    queryKey: ['staff-rs-events', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_service_status_events')
        .select('id, old_status, new_status, message, actor_type, created_at')
        .eq('order_id', orderId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as StatusEvent[];
    },
    enabled: !!orderId,
  });

  // ── Staff list for runner ────────────────────────────────────
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-members', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resort_memberships')
        .select('user_id, profile:profiles!resort_memberships_user_id_fkey(full_name)')
        .eq('resort_id', resortId!);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profile?.full_name || 'Staff',
      })) as StaffMember[];
    },
    enabled: !!resortId,
    staleTime: 60_000,
  });

  // ── Realtime ─────────────────────────────────────────────────
  useRealtimeSubscription({
    channelKey: `staff-rs-detail-${orderId}`,
    tables: [
      { table: 'room_service_orders', filter: createFilter('id', orderId!), event: 'UPDATE' },
      { table: 'room_service_status_events', filter: createFilter('order_id', orderId!), event: 'INSERT' },
    ],
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKey });
      queryClient.invalidateQueries({ queryKey: ['staff-rs-events', orderId] });
      queryClient.invalidateQueries({ queryKey: ['staff-rs-orders'] });
    },
    enabled: !!orderId,
  });

  // Initialize runner from order data
  useEffect(() => {
    if (order?.assigned_runner_staff_id && !selectedRunner) {
      setSelectedRunner(order.assigned_runner_staff_id);
    }
  }, [order?.assigned_runner_staff_id, selectedRunner]);

  // ── Status mutation ──────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({
      newStatus,
      message,
      promised_at,
      runner_id,
    }: {
      newStatus: string;
      message?: string;
      promised_at?: string;
      runner_id?: string;
    }) => {
      const { error } = await supabase.rpc('room_service_set_status', {
        p_order_id: orderId!,
        p_new_status: newStatus,
        p_message: message || null,
        p_promised_at: promised_at || null,
        p_assigned_runner_staff_id: runner_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKey });
      queryClient.invalidateQueries({ queryKey: ['staff-rs-events', orderId] });
      queryClient.invalidateQueries({ queryKey: ['staff-rs-orders'] });
      setInternalMsg('');
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

  const handleStatusAction = useCallback(
    (nextStatus: string) => {
      // Build promised_at from time input
      let promised: string | undefined;
      if (promisedInput) {
        const today = new Date();
        const [h, m] = promisedInput.split(':').map(Number);
        today.setHours(h, m, 0, 0);
        promised = today.toISOString();
      }

      statusMutation.mutate({
        newStatus: nextStatus,
        message: internalMsg.trim() || undefined,
        promised_at: promised,
        runner_id: selectedRunner || undefined,
      });
    },
    [statusMutation, internalMsg, promisedInput, selectedRunner],
  );

  // ── Derived ──────────────────────────────────────────────────
  const guest = order?.guests as any;
  const guestName = guest
    ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Guest'
    : 'Guest';
  const villa = order?.villa_label || order?.room_number || '—';
  const items = (order?.room_service_order_items as unknown as OrderItem[]) || [];
  const isCancelled = order?.status === 'cancelled';
  const isDelivered = order?.status === 'delivered';
  const isTerminal = isCancelled || isDelivered;
  const currentAction = STATUS_ACTIONS.find(a => a.status === order?.status);
  const canCancel = order && CAN_CANCEL.includes(order.status);

  const currentStepIndex = order
    ? TIMELINE_STEPS.findIndex(s => s.key === order.status)
    : -1;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/staff/room-service/orders')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to orders
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : !order ? (
        <p className="text-muted-foreground">Order not found.</p>
      ) : (
        <>
          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{villa}</h1>
              <p className="text-sm text-muted-foreground">
                {guestName} · {format(parseISO(order.placed_at || order.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
            <Badge
              variant={
                isCancelled
                  ? 'destructive'
                  : isDelivered
                  ? 'outline'
                  : 'default'
              }
              className="text-sm px-3 py-1"
            >
              {STATUS_LABELS[order.status] || order.status}
            </Badge>
          </div>

          {/* ── Allergy alert (pinned) ──────────────────────── */}
          {order.allergy_notes && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Allergy Alert
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {order.allergy_notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Mini timeline ───────────────────────────────── */}
          {!isCancelled && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {TIMELINE_STEPS.map((step, idx) => {
                const isComplete = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className="flex-1 flex flex-col items-center gap-1 min-w-[56px]"
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                        isComplete
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                        isCurrent && 'ring-2 ring-primary/30',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      className={cn(
                        'text-[9px] text-center leading-tight',
                        isComplete
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isCancelled && (
            <Card className="border-destructive/20">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-foreground">
                  Cancelled
                  {order.cancel_reason && ` — ${order.cancel_reason}`}
                </span>
              </CardContent>
            </Card>
          )}

          {/* ── Items ───────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, idx) => {
                const mods = item.room_service_order_item_modifiers || [];
                const modTotal = mods.reduce(
                  (s, m) => s + Number(m.price_delta_snapshot),
                  0,
                );
                const lineTotal =
                  (Number(item.unit_price) + modTotal) * item.quantity;
                return (
                  <div key={item.id}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {item.quantity}× {item.item_name}
                        </span>
                        {mods.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {mods
                              .map(
                                m =>
                                  `${m.name_snapshot}${
                                    Number(m.price_delta_snapshot) > 0
                                      ? ` (+${Number(m.price_delta_snapshot).toFixed(2)})`
                                      : ''
                                  }`,
                              )
                              .join(', ')}
                          </p>
                        )}
                        {(item.notes || item.special_requests) && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                            "{item.notes || item.special_requests}"
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-foreground whitespace-nowrap">
                        {order.currency} {lineTotal.toFixed(2)}
                      </span>
                    </div>
                    {idx < items.length - 1 && <Separator className="mt-2" />}
                  </div>
                );
              })}
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{order.currency} {Number(order.subtotal || order.total_amount).toFixed(2)}</span>
                </div>
                {Number(order.service_charge) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service charge</span>
                    <span>{order.currency} {Number(order.service_charge).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t border-border">
                  <span>Total</span>
                  <span>{order.currency} {Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Delivery / special notes ────────────────────── */}
          {(order.delivery_notes || order.special_instructions) && (
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {order.delivery_notes && (
                  <div>
                    <span className="font-medium text-foreground">Delivery notes</span>
                    <p className="text-muted-foreground mt-0.5">{order.delivery_notes}</p>
                  </div>
                )}
                {order.special_instructions && (
                  <div>
                    <span className="font-medium text-foreground">Special instructions</span>
                    <p className="text-muted-foreground mt-0.5">{order.special_instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Controls (ETA, Runner, Message, Actions) ───── */}
          {!isTerminal && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ETA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      <Clock className="h-3 w-3 inline mr-1" />
                      ETA (promised time)
                    </label>
                    <Input
                      type="time"
                      value={promisedInput}
                      onChange={e => setPromisedInput(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="HH:MM"
                    />
                    {order.promised_at && !promisedInput && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Current: {format(parseISO(order.promised_at), 'h:mm a')}
                      </p>
                    )}
                  </div>

                  {/* Runner */}
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      <UserRound className="h-3 w-3 inline mr-1" />
                      Assign runner
                    </label>
                    <Select
                      value={selectedRunner}
                      onValueChange={setSelectedRunner}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Internal message */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    <Send className="h-3 w-3 inline mr-1" />
                    Internal note (logged with status change)
                  </label>
                  <Textarea
                    value={internalMsg}
                    onChange={e => setInternalMsg(e.target.value)}
                    placeholder="e.g. Guest requested no ice"
                    className="resize-none text-sm"
                    rows={2}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  {currentAction && (
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => handleStatusAction(currentAction.next)}
                      disabled={statusMutation.isPending}
                    >
                      <currentAction.icon className="h-4 w-4" />
                      {currentAction.label}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusAction('cancelled')}
                      disabled={statusMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Activity log ────────────────────────────────── */}
          {events.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.map(ev => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="text-muted-foreground whitespace-nowrap w-16 flex-shrink-0">
                      {format(parseISO(ev.created_at), 'h:mm a')}
                    </span>
                    <div className="flex-1">
                      <span className="text-foreground">
                        {STATUS_LABELS[ev.new_status] || ev.new_status}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        by {ev.actor_type}
                      </span>
                      {ev.message && (
                        <p className="text-muted-foreground/70 mt-0.5 italic">
                          "{ev.message}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
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
