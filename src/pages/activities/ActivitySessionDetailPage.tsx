import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ActivitySession, ActivityBooking, Activity, Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Plus, Users, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { BookingAuditTrail } from '@/components/bookings/BookingAuditTrail';
import { ActivitySessionDialog } from './ActivitySessionDialog';
import { ActivityBookingDialog } from './ActivityBookingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionWithDetails extends ActivitySession {
  activity: Activity;
}

interface BookingWithGuest extends ActivityBooking {
  guest: Guest;
  created_by_profile?: {
    full_name: string | null;
    username: string | null;
  } | null;
}

// Validate if string is a valid UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default function ActivitySessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();

  // All hooks must be called unconditionally at the top
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [bookings, setBookings] = useState<BookingWithGuest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<'CANCELLED' | 'COMPLETED' | null>(null);

  const canEdit = hasAnyRole(['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']);
  const isReadOnly = hasAnyRole(['MANAGER']) && !hasAnyRole(['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']);
  
  const isValidId = id && isValidUUID(id);

  const fetchSession = async () => {
    if (!id || !isValidId) return;
    setLoading(true);

    const { data: sessionData, error } = await supabase
      .from('activity_sessions')
      .select(`*, activity:activities(*)`)
      .eq('id', id)
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      navigate('/staff/activities/sessions');
      return;
    }

    setSession(sessionData as SessionWithDetails);

    // Fetch bookings with creator info
    const { data: bookingsData } = await supabase
      .from('activity_bookings')
      .select(`*, guest:guests(*)`)
      .eq('session_id', id)
      .order('created_at', { ascending: false });

    if (bookingsData) {
      // Fetch creator profiles for staff-created bookings
      const creatorIds = bookingsData
        .filter(b => b.created_by_user_id)
        .map(b => b.created_by_user_id);
      
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

      const bookingsWithCreator = bookingsData.map(b => ({
        ...b,
        created_by_profile: b.created_by_user_id ? creatorProfiles[b.created_by_user_id] || null : null,
      }));

      setBookings(bookingsWithCreator as BookingWithGuest[]);
    }

    // Fetch activities for edit dialog
    const { data: activitiesData } = await supabase
      .from('activities')
      .select('*')
      .eq('resort_id', sessionData.resort_id)
      .eq('is_active', true);
    
    if (activitiesData) setActivities(activitiesData as Activity[]);

    setLoading(false);
  };

  useEffect(() => {
    if (isValidId) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [id, isValidId]);

  const updateSessionStatus = async (status: 'CANCELLED' | 'COMPLETED') => {
    if (!session) return;

    const { error } = await supabase
      .from('activity_sessions')
      .update({ status })
      .eq('id', session.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: `Session marked as ${status.toLowerCase()}` });
      fetchSession();
    }
    setStatusConfirm(null);
  };

  // Calculate metrics
  const confirmedPax = bookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + b.num_adults + b.num_children, 0);
  const pendingPax = bookings
    .filter(b => b.status === 'PENDING')
    .reduce((sum, b) => sum + b.num_adults + b.num_children, 0);
  const remainingSpots = session ? session.capacity - confirmedPax : 0;

  // Handle invalid ID after hooks
  if (!isValidId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Invalid session ID</p>
          <Button variant="outline" onClick={() => navigate('/staff/activities/sessions')}>
            Back to Sessions
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Session not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/staff/activities/sessions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{session.activity.name}</h1>
          <p className="text-muted-foreground">
            {format(parseISO(session.date), 'EEEE, MMMM d, yyyy')} • {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Session Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="text-xl font-bold">{session.capacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-xl font-bold text-success">{confirmedPax}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-warning">{pendingPax}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${remainingSpots <= 0 ? 'bg-destructive/10' : remainingSpots <= 3 ? 'bg-warning/10' : 'bg-muted'}`}>
                <MapPin className={`h-5 w-5 ${remainingSpots <= 0 ? 'text-destructive' : remainingSpots <= 3 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-xl font-bold ${remainingSpots <= 0 ? 'text-destructive' : ''}`}>{remainingSpots}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Session Details</CardTitle>
          {canEdit && session.status === 'SCHEDULED' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => setStatusConfirm('COMPLETED')}>
                Mark Completed
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setStatusConfirm('CANCELLED')}>
                Cancel Session
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Activity</dt>
              <dd className="font-medium">{session.activity.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Duration</dt>
              <dd className="font-medium">{session.activity.duration_minutes} min</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Price/Person</dt>
              <dd className="font-medium">${session.activity.default_price_per_person}</dd>
            </div>
            {session.notes && (
              <div className="col-span-2 md:col-span-4">
                <dt className="text-sm text-muted-foreground">Notes</dt>
                <dd className="font-medium">{session.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bookings ({bookings.length})</CardTitle>
          {canEdit && session.status === 'SCHEDULED' && remainingSpots > 0 && (
            <Button onClick={() => setBookingDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Booking
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bookings yet
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
                    <TableHead>Total</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Booked By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <button 
                          className="text-primary hover:underline"
                          onClick={() => navigate(`/staff/guests/${booking.guest_id}`)}
                        >
                          {booking.guest.full_name}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono">{booking.room_number}</TableCell>
                      <TableCell>{booking.num_adults}</TableCell>
                      <TableCell>{booking.num_children}</TableCell>
                      <TableCell>${booking.total_amount}</TableCell>
                      <TableCell className="text-xs">{booking.source.replace('STAFF_', '')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {booking.source === 'GUEST_PORTAL' ? (
                          <span className="italic">Guest</span>
                        ) : booking.created_by_profile ? (
                          <span>{booking.created_by_profile.full_name || booking.created_by_profile.username || 'Staff'}</span>
                        ) : (
                          <span className="italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell className="max-w-32 truncate">{booking.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Audit Trail - Manager and above only */}
      {bookings.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-medium mb-2">
                    {booking.guest.full_name} - Room {booking.room_number}
                  </p>
                  <BookingAuditTrail bookingId={booking.id} bookingType="ACTIVITY" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <ActivitySessionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        session={session}
        resortId={session.resort_id}
        activities={activities}
        onSuccess={fetchSession}
      />

      {/* Booking Dialog */}
      <ActivityBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        session={session}
        onSuccess={fetchSession}
      />

      {/* Status Confirmation */}
      <AlertDialog open={!!statusConfirm} onOpenChange={() => setStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirm === 'CANCELLED' ? 'Cancel Session' : 'Complete Session'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirm === 'CANCELLED' 
                ? 'Are you sure you want to cancel this session? This action cannot be undone.'
                : 'Mark this session as completed?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => statusConfirm && updateSessionStatus(statusConfirm)}
              className={statusConfirm === 'CANCELLED' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
