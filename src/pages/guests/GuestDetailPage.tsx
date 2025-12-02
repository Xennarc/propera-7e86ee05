import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Calendar, Utensils, Phone, Mail, User, MessageSquareHeart, Link as LinkIcon, Star, Crown, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { GuestDialog } from './GuestDialog';
import { ActivityBookingDialog } from '@/pages/activities/ActivityBookingDialog';
import { StayFeedbackDialog } from '@/components/feedback/StayFeedbackDialog';
import { GeneratePreArrivalLinkDialog } from '@/components/guest/GeneratePreArrivalLinkDialog';
import { LoyaltyEditDialog } from '@/components/guest/LoyaltyEditDialog';
import { GuestPinManager } from '@/components/guest/GuestPinManager';

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
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [preArrivalDialogOpen, setPreArrivalDialogOpen] = useState(false);
  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<any[]>([]);

  const canEdit = hasAnyRole(['ADMIN', 'FRONT_OFFICE']);
  const canEditLoyalty = hasAnyRole(['ADMIN', 'MANAGER']);

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

    // Fetch stay feedback
    const { data: feedbackData } = await supabase
      .from('stay_feedback')
      .select('*')
      .eq('guest_id', id)
      .order('created_at', { ascending: false });

    if (feedbackData) {
      setFeedback(feedbackData);
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
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{guest.full_name}</h1>
            {guest.is_vip && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                <Crown className="h-3 w-3 mr-1" />
                VIP
              </Badge>
            )}
            {guest.loyalty_tier && (
              <Badge variant="outline" className="border-primary">
                <Star className="h-3 w-3 mr-1" />
                {guest.loyalty_tier}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Room {guest.room_number} • {format(parseISO(guest.check_in_date), 'MMM d')} - {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setPreArrivalDialogOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Pre-Arrival Link
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(true)}>
              <MessageSquareHeart className="h-4 w-4 mr-2" />
              Record Feedback
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
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

      {/* Loyalty & Internal Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Loyalty & Internal Notes
          </CardTitle>
          {canEditLoyalty && (
            <Button variant="outline" size="sm" onClick={() => setLoyaltyDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground mb-1">VIP Status</dt>
              <dd>
                {guest.is_vip ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    VIP Guest
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Standard</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground mb-1">Loyalty Tier</dt>
              <dd>
                {guest.loyalty_tier ? (
                  <Badge variant="outline" className="border-primary">
                    <Star className="h-3 w-3 mr-1" />
                    {guest.loyalty_tier}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </dd>
            </div>
            <div className="md:col-span-1">
              <dt className="text-sm text-muted-foreground mb-1">Internal Notes</dt>
              <dd className="text-sm">
                {guest.notes_internal ? (
                  <span className="whitespace-pre-wrap">{guest.notes_internal}</span>
                ) : (
                  <span className="text-muted-foreground italic">No notes</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Guest Portal PIN */}
      {canEdit && (
        <GuestPinManager
          guestId={guest.id}
          guestName={guest.full_name}
          pinLast4={guest.portal_pin_last4 || null}
          pinSetAt={guest.portal_pin_set_at || null}
          portalEnabled={guest.portal_enabled || false}
          onPinUpdated={fetchGuest}
        />
      )}

      {/* Stay Feedback */}
      {feedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Stay Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedback.map((fb) => (
                <div key={fb.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {format(parseISO(fb.check_out_date), 'MMM d, yyyy')}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < fb.overall_rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                        <span className="text-sm font-medium ml-1">{fb.overall_rating}/5</span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        fb.would_recommend === 'YES'
                          ? 'confirmed'
                          : fb.would_recommend === 'NO'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {fb.would_recommend === 'YES'
                        ? 'Would Recommend'
                        : fb.would_recommend === 'NO'
                        ? 'Would Not Recommend'
                        : 'Maybe Recommend'}
                    </Badge>
                  </div>
                  {fb.highlight_comment && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Highlights:</p>
                      <p className="text-sm">{fb.highlight_comment}</p>
                    </div>
                  )}
                  {fb.improvement_comment && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                      <p className="text-sm">{fb.improvement_comment}</p>
                    </div>
                  )}
                  {(fb.rating_activities || fb.rating_diving || fb.rating_fnb || fb.rating_room || fb.rating_service) && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t text-xs">
                      {fb.rating_activities && (
                        <span className="text-muted-foreground">
                          Activities: <strong>{fb.rating_activities}/5</strong>
                        </span>
                      )}
                      {fb.rating_diving && (
                        <span className="text-muted-foreground">
                          Diving: <strong>{fb.rating_diving}/5</strong>
                        </span>
                      )}
                      {fb.rating_fnb && (
                        <span className="text-muted-foreground">
                          F&B: <strong>{fb.rating_fnb}/5</strong>
                        </span>
                      )}
                      {fb.rating_room && (
                        <span className="text-muted-foreground">
                          Room: <strong>{fb.rating_room}/5</strong>
                        </span>
                      )}
                      {fb.rating_service && (
                        <span className="text-muted-foreground">
                          Service: <strong>{fb.rating_service}/5</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Stay Feedback Dialog */}
      <StayFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        guest={guest}
        onSuccess={fetchGuest}
      />

      {/* Pre-Arrival Link Dialog */}
      <GeneratePreArrivalLinkDialog
        open={preArrivalDialogOpen}
        onOpenChange={setPreArrivalDialogOpen}
        guest={guest}
      />

      {/* Loyalty Edit Dialog */}
      <LoyaltyEditDialog
        open={loyaltyDialogOpen}
        onOpenChange={setLoyaltyDialogOpen}
        guest={guest}
        onSuccess={fetchGuest}
      />
    </div>
  );
}
