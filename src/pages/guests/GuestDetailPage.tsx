import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Calendar, Utensils, Phone, Mail, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { GuestDialog } from './GuestDialog';
import { ActivityBookingDialog } from '@/pages/activities/ActivityBookingDialog';

interface ActivityBookingWithSession {
  id: string;
  guest_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  num_adults: number;
  num_children: number;
  session: {
    id: string;
    date: string;
    start_time: string;
    activity: { name: string };
  };
}

interface ReservationWithSlot {
  id: string;
  guest_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  num_adults: number;
  num_children: number;
  slot: {
    id: string;
    date: string;
    start_time: string;
    meal_period: string;
    restaurant: { name: string };
  };
}

export default function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();

  const [guest, setGuest] = useState<Guest | null>(null);
  const [activityBookings, setActivityBookings] = useState<ActivityBookingWithSession[]>([]);
  const [restaurantReservations, setRestaurantReservations] = useState<ReservationWithSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityBookingDialogOpen, setActivityBookingDialogOpen] = useState(false);

  const canEdit = hasAnyRole(['ADMIN', 'FRONT_OFFICE']);

  const fetchGuest = async () => {
    if (!id) return;
    setLoading(true);

    const { data: guestData, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      navigate('/guests');
      return;
    }

    setGuest(guestData as Guest);

    // Fetch activity bookings
    const { data: bookingsData } = await supabase
      .from('activity_bookings')
      .select(`
        id, guest_id, status, num_adults, num_children,
        session:activity_sessions(
          id, date, start_time,
          activity:activities(name)
        )
      `)
      .eq('guest_id', id)
      .order('created_at', { ascending: false });

    if (bookingsData) {
      setActivityBookings(bookingsData as any[]);
    }

    // Fetch restaurant reservations
    const { data: reservationsData } = await supabase
      .from('restaurant_reservations')
      .select(`
        id, guest_id, status, num_adults, num_children,
        slot:restaurant_time_slots(
          id, date, start_time, meal_period,
          restaurant:restaurants(name)
        )
      `)
      .eq('guest_id', id)
      .order('created_at', { ascending: false });

    if (reservationsData) {
      setRestaurantReservations(reservationsData as any[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGuest();
  }, [id]);

  // Split bookings into upcoming and past
  const today = startOfDay(new Date());
  const upcomingActivityBookings = activityBookings.filter(b => 
    b.session && !isBefore(parseISO(b.session.date), today)
  );
  const pastActivityBookings = activityBookings.filter(b => 
    b.session && isBefore(parseISO(b.session.date), today)
  );
  const upcomingReservations = restaurantReservations.filter(r => 
    r.slot && !isBefore(parseISO(r.slot.date), today)
  );
  const pastReservations = restaurantReservations.filter(r => 
    r.slot && isBefore(parseISO(r.slot.date), today)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!guest) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Guest not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/guests')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{guest.full_name}</h1>
          <p className="text-muted-foreground">
            Room {guest.room_number} • {format(parseISO(guest.check_in_date), 'MMM d')} - {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Guest Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Room</dt>
              <dd className="font-medium font-mono">{guest.room_number}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Check-in</dt>
              <dd className="font-medium">{format(parseISO(guest.check_in_date), 'MMM d, yyyy')}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Check-out</dt>
              <dd className="font-medium">{format(parseISO(guest.check_out_date), 'MMM d, yyyy')}</dd>
            </div>
            {guest.nationality && (
              <div>
                <dt className="text-sm text-muted-foreground">Nationality</dt>
                <dd className="font-medium">{guest.nationality}</dd>
              </div>
            )}
            {guest.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{guest.email}</span>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{guest.phone}</span>
              </div>
            )}
            {guest.channel && (
              <div>
                <dt className="text-sm text-muted-foreground">Channel</dt>
                <dd><Badge variant="outline">{guest.channel}</Badge></dd>
              </div>
            )}
            {guest.booking_reference && (
              <div>
                <dt className="text-sm text-muted-foreground">Booking Ref</dt>
                <dd className="font-mono text-sm">{guest.booking_reference}</dd>
              </div>
            )}
            {guest.notes && (
              <div className="col-span-2 md:col-span-4">
                <dt className="text-sm text-muted-foreground">Notes</dt>
                <dd>{guest.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Activity Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Bookings
          </CardTitle>
          {canEdit && (
            <Button onClick={() => setActivityBookingDialogOpen(true)}>
              Book Activity
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activityBookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No activity bookings</p>
          ) : (
            <div className="space-y-6">
              {upcomingActivityBookings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Pax</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingActivityBookings.map((booking) => (
                          <TableRow 
                            key={booking.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/activities/sessions/${booking.session.id}`)}
                          >
                            <TableCell className="font-medium">{booking.session.activity.name}</TableCell>
                            <TableCell>{format(parseISO(booking.session.date), 'EEE, MMM d')}</TableCell>
                            <TableCell>{booking.session.start_time.slice(0, 5)}</TableCell>
                            <TableCell>{booking.num_adults + booking.num_children}</TableCell>
                            <TableCell><StatusBadge status={booking.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {pastActivityBookings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Past</h4>
                  <div className="rounded-md border opacity-75">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Pax</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastActivityBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.session.activity.name}</TableCell>
                            <TableCell>{format(parseISO(booking.session.date), 'EEE, MMM d')}</TableCell>
                            <TableCell>{booking.session.start_time.slice(0, 5)}</TableCell>
                            <TableCell>{booking.num_adults + booking.num_children}</TableCell>
                            <TableCell><StatusBadge status={booking.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restaurant Reservations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Restaurant Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {restaurantReservations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No restaurant reservations</p>
          ) : (
            <div className="space-y-6">
              {upcomingReservations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Meal</TableHead>
                          <TableHead>Pax</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingReservations.map((reservation) => (
                          <TableRow 
                            key={reservation.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/restaurants/slots/${reservation.slot.id}`)}
                          >
                            <TableCell className="font-medium">{reservation.slot.restaurant.name}</TableCell>
                            <TableCell>{format(parseISO(reservation.slot.date), 'EEE, MMM d')}</TableCell>
                            <TableCell>{reservation.slot.start_time.slice(0, 5)}</TableCell>
                            <TableCell><Badge variant="outline">{reservation.slot.meal_period}</Badge></TableCell>
                            <TableCell>{reservation.num_adults + reservation.num_children}</TableCell>
                            <TableCell><StatusBadge status={reservation.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {pastReservations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Past</h4>
                  <div className="rounded-md border opacity-75">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Meal</TableHead>
                          <TableHead>Pax</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastReservations.map((reservation) => (
                          <TableRow key={reservation.id}>
                            <TableCell className="font-medium">{reservation.slot.restaurant.name}</TableCell>
                            <TableCell>{format(parseISO(reservation.slot.date), 'EEE, MMM d')}</TableCell>
                            <TableCell>{reservation.slot.start_time.slice(0, 5)}</TableCell>
                            <TableCell><Badge variant="outline">{reservation.slot.meal_period}</Badge></TableCell>
                            <TableCell>{reservation.num_adults + reservation.num_children}</TableCell>
                            <TableCell><StatusBadge status={reservation.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Guest Dialog */}
      {guest && (
        <GuestDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          guest={guest}
          resortId={guest.resort_id}
          onSuccess={fetchGuest}
        />
      )}

      {/* Activity Booking Dialog */}
      <ActivityBookingDialog
        open={activityBookingDialogOpen}
        onOpenChange={setActivityBookingDialogOpen}
        guest={guest}
        onSuccess={fetchGuest}
      />
    </div>
  );
}
