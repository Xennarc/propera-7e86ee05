import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RestaurantTimeSlot, Restaurant, Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Plus, Users, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { BookingAuditTrail } from '@/components/bookings/BookingAuditTrail';
import { RestaurantSlotDialog } from './RestaurantSlotDialog';
import { RestaurantReservationDialog } from './RestaurantReservationDialog';

interface SlotWithRestaurant extends RestaurantTimeSlot {
  restaurant: Restaurant;
}

interface ReservationWithGuest {
  id: string;
  guest_id: string;
  room_number: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  source: string;
  num_adults: number;
  num_children: number;
  special_requests: string | null;
  created_by_user_id: string | null;
  guest: Guest;
  created_by_profile?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

export default function RestaurantSlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();

  const [slot, setSlot] = useState<SlotWithRestaurant | null>(null);
  const [reservations, setReservations] = useState<ReservationWithGuest[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);

  const canEdit = hasAnyRole(['ADMIN', 'FRONT_OFFICE', 'FNB']);

  const fetchSlot = async () => {
    if (!id) return;
    setLoading(true);

    const { data: slotData, error } = await supabase
      .from('restaurant_time_slots')
      .select(`*, restaurant:restaurants(*)`)
      .eq('id', id)
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      navigate('/restaurants/slots');
      return;
    }

    setSlot(slotData as SlotWithRestaurant);

    // Fetch reservations with creator info
    const { data: reservationsData } = await supabase
      .from('restaurant_reservations')
      .select(`*, guest:guests(*)`)
      .eq('restaurant_slot_id', id)
      .order('created_at', { ascending: false });

    if (reservationsData) {
      // Fetch creator profiles for staff-created reservations
      const creatorIds = reservationsData
        .filter(r => r.created_by_user_id)
        .map(r => r.created_by_user_id);
      
      let creatorProfiles: Record<string, { full_name: string | null; username: string | null }> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', creatorIds);
        
        if (profiles) {
          creatorProfiles = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, username: p.username };
            return acc;
          }, {} as Record<string, { full_name: string | null; username: string | null }>);
        }
      }

      const reservationsWithCreator = reservationsData.map(r => ({
        ...r,
        created_by_profile: r.created_by_user_id ? creatorProfiles[r.created_by_user_id] || null : null,
      }));

      setReservations(reservationsWithCreator as ReservationWithGuest[]);
    }

    // Fetch restaurants for edit
    const { data: restaurantsData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('resort_id', slotData.resort_id)
      .eq('is_active', true);
    
    if (restaurantsData) setRestaurants(restaurantsData as Restaurant[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchSlot();
  }, [id]);

  const bookedCovers = reservations
    .filter(r => r.status === 'CONFIRMED')
    .reduce((sum, r) => sum + r.num_adults + r.num_children, 0);
  const remainingCovers = slot ? slot.capacity - bookedCovers : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!slot) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Slot not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/restaurants/slots')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{slot.restaurant.name}</h1>
          <p className="text-muted-foreground">
            {format(parseISO(slot.date), 'EEEE, MMMM d, yyyy')} • {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">{slot.meal_period}</Badge>
        <StatusBadge status={slot.status} />
      </div>

      {/* Slot Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="text-xl font-bold">{slot.capacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Utensils className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booked</p>
                <p className="text-xl font-bold text-success">{bookedCovers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${remainingCovers <= 0 ? 'bg-destructive/10' : remainingCovers <= 10 ? 'bg-warning/10' : 'bg-muted'}`}>
                <Users className={`h-5 w-5 ${remainingCovers <= 0 ? 'text-destructive' : remainingCovers <= 10 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-xl font-bold ${remainingCovers <= 0 ? 'text-destructive' : ''}`}>{remainingCovers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reservations ({reservations.length})</CardTitle>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Slot
              </Button>
            )}
            {canEdit && slot.status === 'OPEN' && remainingCovers > 0 && (
              <Button onClick={() => setReservationDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Reservation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reservations yet
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Adults</TableHead>
                    <TableHead>Children</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Booked By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Special Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        <button 
                          className="text-primary hover:underline"
                          onClick={() => navigate(`/guests/${reservation.guest_id}`)}
                        >
                          {reservation.guest.full_name}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono">{reservation.room_number}</TableCell>
                      <TableCell>{reservation.num_adults}</TableCell>
                      <TableCell>{reservation.num_children}</TableCell>
                      <TableCell className="text-xs">{reservation.source.replace('STAFF_', '')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {reservation.source === 'GUEST_PORTAL' ? (
                          <span className="italic">Guest</span>
                        ) : reservation.created_by_profile ? (
                          <span>{reservation.created_by_profile.full_name || reservation.created_by_profile.username || 'Staff'}</span>
                        ) : (
                          <span className="italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={reservation.status} />
                      </TableCell>
                      <TableCell className="max-w-32 truncate">{reservation.special_requests || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Audit Trail - Manager and above only */}
      {reservations.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-medium mb-2">
                    {reservation.guest.full_name} - Room {reservation.room_number}
                  </p>
                  <BookingAuditTrail bookingId={reservation.id} bookingType="RESTAURANT" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <RestaurantSlotDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        slot={slot}
        resortId={slot.resort_id}
        restaurants={restaurants}
        onSuccess={fetchSlot}
      />

      {/* Reservation Dialog */}
      <RestaurantReservationDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        slot={slot}
        onSuccess={fetchSlot}
      />
    </div>
  );
}
