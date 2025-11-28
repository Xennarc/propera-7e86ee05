/**
 * Booking Health Check Page
 * 
 * Internal diagnostic tool for SUPER_ADMIN and RESORT_ADMIN to identify
 * booking inconsistencies and data integrity issues.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';

interface HealthIssue {
  type: 'activity_overcapacity' | 'restaurant_overcapacity' | 'outside_stay_dates';
  severity: 'warning' | 'error';
  description: string;
  details: Record<string, any>;
}

export default function BookingHealthPage() {
  const { currentResort } = useResort();
  const { isSuperAdmin, hasResortRole } = useAuth();
  
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));

  // Only SUPER_ADMIN or RESORT_ADMIN can access
  const canAccess = isSuperAdmin() || (currentResort && hasResortRole(currentResort.id, ['RESORT_ADMIN']));

  const { data: healthCheck, isLoading, refetch } = useQuery({
    queryKey: ['booking-health', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return { issues: [], summary: { total: 0, warnings: 0, errors: 0 } };

      const issues: HealthIssue[] = [];

      // 1. Check for activity sessions with overbooking
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select(`
          id, date, start_time, capacity,
          activity:activities(name),
          bookings:activity_bookings(id, num_adults, num_children, status, guest_id)
        `)
        .eq('resort_id', currentResort.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'SCHEDULED');

      if (sessions) {
        for (const session of sessions) {
          const confirmedPax = (session.bookings as any[])
            ?.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
            .reduce((sum, b) => sum + b.num_adults + b.num_children, 0) || 0;

          if (confirmedPax > session.capacity) {
            issues.push({
              type: 'activity_overcapacity',
              severity: 'error',
              description: `Session overbooking: ${confirmedPax} pax for ${session.capacity} capacity`,
              details: {
                sessionId: session.id,
                activityName: (session.activity as any)?.name,
                date: session.date,
                time: session.start_time,
                capacity: session.capacity,
                bookedPax: confirmedPax,
                excess: confirmedPax - session.capacity,
              },
            });
          }
        }
      }

      // 2. Check for restaurant slots with overbooking
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select(`
          id, date, start_time, capacity, meal_period,
          restaurant:restaurants(name),
          reservations:restaurant_reservations(id, num_adults, num_children, status)
        `)
        .eq('resort_id', currentResort.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'OPEN');

      if (slots) {
        for (const slot of slots) {
          const confirmedCovers = (slot.reservations as any[])
            ?.filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
            .reduce((sum, r) => sum + r.num_adults + r.num_children, 0) || 0;

          if (confirmedCovers > slot.capacity) {
            issues.push({
              type: 'restaurant_overcapacity',
              severity: 'error',
              description: `Slot overbooking: ${confirmedCovers} covers for ${slot.capacity} capacity`,
              details: {
                slotId: slot.id,
                restaurantName: (slot.restaurant as any)?.name,
                date: slot.date,
                time: slot.start_time,
                mealPeriod: slot.meal_period,
                capacity: slot.capacity,
                bookedCovers: confirmedCovers,
                excess: confirmedCovers - slot.capacity,
              },
            });
          }
        }
      }

      // 3. Check for bookings outside guest stay dates
      const { data: activityBookings } = await supabase
        .from('activity_bookings')
        .select(`
          id, guest_id, status,
          session:activity_sessions(date, activity:activities(name)),
          guest:guests(full_name, room_number, check_in_date, check_out_date)
        `)
        .eq('resort_id', currentResort.id)
        .in('status', ['CONFIRMED', 'PENDING']);

      if (activityBookings) {
        for (const booking of activityBookings) {
          const session = booking.session as any;
          const guest = booking.guest as any;
          
          if (session && guest && guest.check_in_date && guest.check_out_date) {
            const sessionDate = session.date;
            if (sessionDate < guest.check_in_date || sessionDate > guest.check_out_date) {
              issues.push({
                type: 'outside_stay_dates',
                severity: 'warning',
                description: `Activity booking outside stay dates`,
                details: {
                  bookingId: booking.id,
                  guestName: guest.full_name,
                  roomNumber: guest.room_number,
                  activityName: session.activity?.name,
                  sessionDate,
                  checkIn: guest.check_in_date,
                  checkOut: guest.check_out_date,
                },
              });
            }
          }
        }
      }

      // Calculate summary
      const warnings = issues.filter(i => i.severity === 'warning').length;
      const errors = issues.filter(i => i.severity === 'error').length;

      return {
        issues,
        summary: {
          total: issues.length,
          warnings,
          errors,
        },
      };
    },
    enabled: !!currentResort && canAccess,
  });

  if (!canAccess) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Only SUPER_ADMIN and RESORT_ADMIN users can view booking health checks.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentResort) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select a resort.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Booking Health Check</h1>
        <p className="text-muted-foreground">
          Identify booking inconsistencies and data integrity issues
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Run Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold">{healthCheck?.summary.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-destructive">{healthCheck?.summary.errors || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-2xl font-bold text-warning">{healthCheck?.summary.warnings || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Issues Found</CardTitle>
          <CardDescription>
            Review and address these booking inconsistencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : healthCheck?.issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <p className="text-muted-foreground">No issues found. All bookings are healthy!</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthCheck?.issues.map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant={issue.severity === 'error' ? 'destructive' : 'warning'}>
                          {issue.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {issue.type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>{issue.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {issue.type === 'activity_overcapacity' && (
                          <>
                            {issue.details.activityName} on {issue.details.date} at {issue.details.time?.slice(0, 5)} - 
                            {' '}{issue.details.excess} excess pax
                          </>
                        )}
                        {issue.type === 'restaurant_overcapacity' && (
                          <>
                            {issue.details.restaurantName} ({issue.details.mealPeriod}) on {issue.details.date} - 
                            {' '}{issue.details.excess} excess covers
                          </>
                        )}
                        {issue.type === 'outside_stay_dates' && (
                          <>
                            {issue.details.guestName} (Room {issue.details.roomNumber}) - 
                            {' '}{issue.details.activityName} on {issue.details.sessionDate}
                            {' '}(Stay: {issue.details.checkIn} to {issue.details.checkOut})
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
