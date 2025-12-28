import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDistanceToNow, differenceInMinutes, parseISO, format } from 'date-fns';
import { AlertTriangle, Clock, User, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OverdueBooking {
  id: string;
  created_at: string;
  vendor_status: string;
  total_amount: number;
  num_adults: number;
  num_children: number;
  notes: string | null;
  room_number: string;
  guest: {
    full_name: string;
  };
  session: {
    date: string;
    start_time: string;
    activity: {
      name: string;
    };
  };
  vendor: {
    id: string;
    name: string;
  };
  vendor_resort: {
    ack_sla_minutes: number | null;
  } | null;
}

export default function VendorAttentionPage() {
  const { currentResort } = useResort();

  const { data: overdueBookings, isLoading } = useQuery({
    queryKey: ['vendor-attention', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];

      // Get all pending_ack vendor bookings with their SLA info
      const { data, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          created_at,
          vendor_status,
          total_amount,
          num_adults,
          num_children,
          notes,
          room_number,
          guest:guests(full_name),
          session:activity_sessions(
            date,
            start_time,
            activity:activities(name)
          ),
          vendor:vendors(id, name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('provider_type', 'VENDOR')
        .eq('vendor_status', 'PENDING_ACK')
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get vendor_resorts for SLA info
      const vendorIds = [...new Set((data || []).map(b => b.vendor?.id).filter(Boolean))];
      const { data: vendorResorts } = await supabase
        .from('vendor_resorts')
        .select('vendor_id, ack_sla_minutes')
        .eq('resort_id', currentResort.id)
        .in('vendor_id', vendorIds);

      const vendorSlaMap = new Map(
        (vendorResorts || []).map(vr => [vr.vendor_id, vr.ack_sla_minutes])
      );

      // Filter to only show overdue bookings
      const now = new Date();
      return (data || [])
        .map(booking => ({
          ...booking,
          vendor_resort: {
            ack_sla_minutes: vendorSlaMap.get(booking.vendor?.id) || 120,
          },
        }))
        .filter(booking => {
          const createdAt = parseISO(booking.created_at);
          const slaMinutes = booking.vendor_resort?.ack_sla_minutes || 120;
          const minutesSinceCreation = differenceInMinutes(now, createdAt);
          return minutesSinceCreation > slaMinutes;
        }) as OverdueBooking[];
    },
    enabled: !!currentResort?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Vendor Attention Required
        </h1>
        <p className="text-sm text-muted-foreground">
          Bookings that vendors haven't acknowledged within their SLA
        </p>
      </div>

      {overdueBookings?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-medium text-lg">All Clear</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
              No vendor bookings are overdue. All vendors are responding within their SLA.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {overdueBookings?.map((booking) => {
            const createdAt = parseISO(booking.created_at);
            const minutesOverdue = differenceInMinutes(new Date(), createdAt) - (booking.vendor_resort?.ack_sla_minutes || 120);

            return (
              <Card key={booking.id} className="border-amber-500/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {booking.session?.activity?.name}
                        <Badge variant="destructive" className="text-xs">
                          {minutesOverdue}m overdue
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Operated by {booking.vendor?.name}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/staff/activities/sessions/${booking.session?.date}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(parseISO(booking.session?.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-muted-foreground">
                          {booking.session?.start_time?.slice(0, 5)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{booking.guest?.full_name}</div>
                        <div className="text-muted-foreground">Room {booking.room_number}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {booking.num_adults + booking.num_children} pax
                      </div>
                      <div className="text-muted-foreground">
                        {booking.num_adults} adults
                        {booking.num_children > 0 && `, ${booking.num_children} children`}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">
                        Booked {formatDistanceToNow(createdAt, { addSuffix: true })}
                      </div>
                      <div className="text-muted-foreground">
                        SLA: {booking.vendor_resort?.ack_sla_minutes || 120} min
                      </div>
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="text-sm bg-muted/50 rounded-lg p-3">
                      <span className="font-medium">Notes:</span> {booking.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
