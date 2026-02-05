import { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import {
  useDriverTripHistory,
  groupTripsByDate,
  type DriverTripHistoryRow,
  type HistoryDateRange,
} from '@/hooks/driver/useDriverTripHistory';
import type { DriverOutletContext } from '@/components/driver/DriverLayout';
import { DriverHistoryDrawer } from '@/components/driver/DriverHistoryDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Inbox,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';

export default function DriverHistoryPage() {
  const { user } = useAuth();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  const { driverSession } = useOutletContext<DriverOutletContext>();

  const [dateRange, setDateRange] = useState<HistoryDateRange>('7d');
  const [selectedTrip, setSelectedTrip] = useState<DriverTripHistoryRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: trips = [], isLoading } = useDriverTripHistory(resortId, user?.id, dateRange);

  const groupedTrips = useMemo(() => groupTripsByDate(trips), [trips]);

  const handleSelectTrip = (trip: DriverTripHistoryRow) => {
    setSelectedTrip(trip);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-8 z-40 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/driver">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg">Trip History</h1>
            <p className="text-xs text-muted-foreground">
              Your completed and cancelled trips
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Toggle */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setDateRange('7d')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                dateRange === '7d'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Last 7 days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                dateRange === '30d'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Last 30 days
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-lg mx-auto pb-8">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No trips found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateRange === '7d'
                    ? 'No completed trips in the last 7 days. Try expanding to 30 days.'
                    : 'No completed trips in the last 30 days.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Array.from(groupedTrips.entries()).map(([dateKey, dayTrips]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <h2 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                    {dateKey !== 'unknown'
                      ? format(parseISO(dateKey), 'EEEE, MMMM d')
                      : 'Unknown Date'}
                  </h2>

                  {/* Trips for this day */}
                  <div className="space-y-2">
                    {dayTrips.map((trip) => (
                      <TripHistoryItem
                        key={trip.id}
                        trip={trip}
                        onSelect={() => handleSelectTrip(trip)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Detail Drawer */}
      <DriverHistoryDrawer
        trip={selectedTrip}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

function TripHistoryItem({
  trip,
  onSelect,
}: {
  trip: DriverTripHistoryRow;
  onSelect: () => void;
}) {
  const isCompleted = trip.status === 'completed';
  const finishedAt = trip.completed_at || trip.cancelled_at || trip.end_at;
  const duration = trip.start_at && trip.end_at
    ? differenceInMinutes(new Date(trip.end_at), new Date(trip.start_at))
    : null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all',
        'hover:bg-accent/50 hover:border-primary/20',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'active:scale-[0.98]'
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge variant={isCompleted ? 'outline' : 'destructive'} className="gap-1">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              Completed
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" />
              Cancelled
            </>
          )}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {finishedAt ? format(new Date(finishedAt), 'h:mm a') : '—'}
        </span>
      </div>

      {/* Route */}
      {trip.first_stop_name && trip.last_stop_name ? (
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <span className="truncate">{trip.first_stop_name}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{trip.last_stop_name}</span>
        </div>
      ) : (
        <p className="text-sm font-medium mb-2">Trip</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {trip.stop_count} stops
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {trip.capacity_total ?? trip.request_count} pax
        </span>
        {duration !== null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {duration} min
          </span>
        )}
      </div>
    </button>
  );
}
