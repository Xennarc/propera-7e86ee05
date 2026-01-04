import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useVendorPortal, VendorBooking } from '@/hooks/useVendorPortal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Building2, LogOut, Calendar, Clock, User, Users, 
  CheckCircle2, XCircle, AlertCircle, CheckCheck 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export default function VendorBookings() {
  const { 
    session, 
    isValidating, 
    isAuthenticated, 
    bookings, 
    isLoadingBookings,
    logout,
    acknowledgeBooking,
    completeBooking,
    isAcknowledging,
    isCompleting,
  } = useVendorPortal();

  const [confirmAction, setConfirmAction] = useState<{
    booking: VendorBooking;
    action: 'ACK' | 'DECLINE' | 'COMPLETE';
  } | null>(null);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/vendor/login" replace />;
  }

  const pendingBookings = bookings.filter(b => b.vendor_status === 'PENDING_ACK');
  const ackedBookings = bookings.filter(b => b.vendor_status === 'ACKED');
  const completedBookings = bookings.filter(b => b.vendor_status === 'COMPLETED');

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    try {
      if (confirmAction.action === 'COMPLETE') {
        await completeBooking(confirmAction.booking.booking_id);
      } else {
        await acknowledgeBooking({ 
          bookingId: confirmAction.booking.booking_id, 
          action: confirmAction.action 
        });
      }
    } finally {
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (status: VendorBooking['vendor_status']) => {
    switch (status) {
      case 'PENDING_ACK':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case 'ACKED':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Acknowledged</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'DECLINED':
        return <Badge variant="destructive">Declined</Badge>;
      case 'NO_SHOW':
        return <Badge variant="secondary">No Show</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const BookingCard = ({ booking, showActions = false }: { booking: VendorBooking; showActions?: boolean }) => (
    <Card key={booking.booking_id}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{booking.activity_name}</CardTitle>
            <CardDescription>{booking.resort_name}</CardDescription>
          </div>
          {getStatusBadge(booking.vendor_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(parseISO(booking.session_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{booking.guest_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{booking.num_adults + booking.num_children} pax</span>
          </div>
        </div>
        
        {booking.notes && (
          <div className="text-sm bg-muted/50 rounded-lg p-3">
            <span className="font-medium">Notes:</span> {booking.notes}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-medium">${booking.total_amount.toFixed(2)}</span>
          
          {showActions && booking.vendor_status === 'PENDING_ACK' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmAction({ booking, action: 'DECLINE' })}
                disabled={isAcknowledging}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmAction({ booking, action: 'ACK' })}
                disabled={isAcknowledging}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
            </div>
          )}
          
          {showActions && booking.vendor_status === 'ACKED' && (
            <Button
              size="sm"
              onClick={() => setConfirmAction({ booking, action: 'COMPLETE' })}
              disabled={isCompleting}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{session?.vendorName}</h1>
              <p className="text-sm text-muted-foreground">{session?.vendorEmail}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBookings.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting acknowledgement</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ackedBookings.length}</div>
              <p className="text-xs text-muted-foreground">Acknowledged, to be fulfilled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedBookings.length}</div>
              <p className="text-xs text-muted-foreground">Ready for settlement</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoadingBookings ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : pendingBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-medium text-lg">All caught up!</h3>
                  <p className="text-sm text-muted-foreground">No bookings pending acknowledgement</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingBookings.map(booking => (
                  <BookingCard key={booking.booking_id} booking={booking} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {ackedBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No upcoming bookings</h3>
                  <p className="text-sm text-muted-foreground">Acknowledged bookings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ackedBookings.map(booking => (
                  <BookingCard key={booking.booking_id} booking={booking} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No completed bookings yet</h3>
                  <p className="text-sm text-muted-foreground">Completed bookings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {completedBookings.map(booking => (
                  <BookingCard key={booking.booking_id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={
          confirmAction?.action === 'ACK' ? 'Acknowledge Booking' :
          confirmAction?.action === 'DECLINE' ? 'Decline Booking' :
          'Complete Booking'
        }
        description={
          confirmAction?.action === 'ACK' 
            ? 'Confirm that you will fulfill this booking. The guest and resort staff will be notified.'
            : confirmAction?.action === 'DECLINE'
            ? 'This will cancel the booking. The guest will be notified and may need to rebook.'
            : 'Mark this booking as completed. This will trigger settlement calculation.'
        }
        onConfirm={handleConfirmAction}
        variant={confirmAction?.action === 'DECLINE' ? 'destructive' : 'default'}
      />
    </div>
  );
}
