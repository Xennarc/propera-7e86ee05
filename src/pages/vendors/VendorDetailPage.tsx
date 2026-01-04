import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { VendorLedgerPanel } from '@/components/vendors/VendorLedgerPanel';
import { ArrowLeft, Building2, Mail, Phone, Percent, Clock, FileText } from 'lucide-react';
import { Vendor, VendorResort } from '@/types/vendor';

export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { currentResort } = useResort();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-detail', vendorId, currentResort?.id],
    queryFn: async () => {
      if (!vendorId || !currentResort?.id) return null;

      // Get vendor with resort link
      const { data: vendorResort, error } = await supabase
        .from('vendor_resorts')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('vendor_id', vendorId)
        .eq('resort_id', currentResort.id)
        .single();

      if (error) throw error;

      return {
        ...vendorResort.vendor,
        vendorResort: {
          id: vendorResort.id,
          status: vendorResort.status,
          commission_rate_override: vendorResort.commission_rate_override,
          operational_notes: vendorResort.operational_notes,
          ack_sla_minutes: vendorResort.ack_sla_minutes,
        },
      } as Vendor & { vendorResort: Partial<VendorResort> };
    },
    enabled: !!vendorId && !!currentResort?.id,
  });

  // Get pending bookings count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['vendor-pending-count', vendorId, currentResort?.id],
    queryFn: async () => {
      if (!vendorId || !currentResort?.id) return 0;

      const { count } = await supabase
        .from('activity_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('resort_id', currentResort.id)
        .eq('vendor_status', 'PENDING_ACK')
        .neq('status', 'CANCELLED');

      return count || 0;
    },
    enabled: !!vendorId && !!currentResort?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vendor not found</p>
        <Button variant="link" asChild>
          <Link to="/staff/vendors">Back to Vendors</Link>
        </Button>
      </div>
    );
  }

  const commissionRate = vendor.vendorResort?.commission_rate_override 
    ?? vendor.default_commission_rate 
    ?? 0.15;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/staff/vendors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {vendor.contact_name && <span>{vendor.contact_name}</span>}
              <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                {vendor.status}
              </Badge>
              <Badge variant={vendor.vendorResort?.status === 'approved' ? 'outline' : 'destructive'}>
                {vendor.vendorResort?.status || 'approved'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(commissionRate * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {vendor.vendorResort?.commission_rate_override ? 'Custom rate' : 'Default rate'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Ack</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting acknowledgement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendor.vendorResort?.ack_sla_minutes || 120} min
            </div>
            <p className="text-xs text-muted-foreground">Acknowledgement window</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {vendor.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {vendor.phone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Notes */}
      {vendor.vendorResort?.operational_notes && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <CardTitle className="text-base">Operational Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {vendor.vendorResort.operational_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Settlement Ledger</TabsTrigger>
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <VendorLedgerPanel vendorId={vendor.id} vendorName={vendor.name} />
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <VendorBookingsTab vendorId={vendor.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple bookings tab component
function VendorBookingsTab({ vendorId }: { vendorId: string }) {
  const { currentResort } = useResort();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['vendor-bookings-list', vendorId, currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];

      const { data, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          created_at,
          vendor_status,
          status,
          total_amount,
          num_adults,
          num_children,
          room_number,
          guest:guests(full_name),
          session:activity_sessions(
            date,
            start_time,
            activity:activities(name)
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('resort_id', currentResort.id)
        .eq('provider_type', 'VENDOR')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId && !!currentResort?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No bookings found for this vendor
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y">
        {bookings.map((booking) => (
          <div key={booking.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{(booking.session as any)?.activity?.name}</div>
              <div className="text-sm text-muted-foreground">
                {(booking.guest as any)?.full_name} • Room {booking.room_number} •{' '}
                {booking.num_adults + booking.num_children} pax
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">${booking.total_amount?.toFixed(2)}</div>
              <Badge 
                variant={
                  booking.vendor_status === 'COMPLETED' ? 'default' :
                  booking.vendor_status === 'ACKED' ? 'secondary' :
                  booking.vendor_status === 'PENDING_ACK' ? 'outline' :
                  'destructive'
                }
              >
                {booking.vendor_status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
