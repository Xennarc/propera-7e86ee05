import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useDriverStats } from '@/hooks/driver/useDriverStats';
import { Card, CardContent } from '@/components/ui/card';
import { KpiGrid, KpiCard, KpiSkeleton } from '@/components/ui/kpi-card';
import { 
  Car, 
  Users, 
  Clock, 
  TrendingUp,
  Inbox,
} from 'lucide-react';

export function DriverStatsSection() {
  const { user } = useAuth();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;

  const { data: stats, isLoading, error } = useDriverStats(resortId, user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <KpiGrid columns="grid-cols-2" maxWidth="full" spacing="dense">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </KpiGrid>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return null;
  }

  if (stats.tripsLast7Days === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No completed trips yet. Your stats will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <KpiGrid columns="grid-cols-2" maxWidth="full" spacing="dense">
          <KpiCard
            icon={Car}
            value={stats.tripsToday}
            label="Trips Today"
            helperText={`${stats.tripsLast7Days} this week`}
            variant="primary"
          />
          <KpiCard
            icon={Users}
            value={stats.passengersToday}
            label="Passengers Today"
            helperText={`${stats.passengersLast7Days} this week`}
            variant="primary"
          />
          <KpiCard
            icon={TrendingUp}
            value={stats.tripsLast7Days}
            label="Trips (7 days)"
          />
          {stats.avgDurationMinutes !== null ? (
            <KpiCard
              icon={Clock}
              value={`${stats.avgDurationMinutes}m`}
              label="Avg Trip Duration"
            />
          ) : (
            <KpiCard
              icon={Clock}
              value={stats.passengersLast7Days}
              label="Passengers (7 days)"
            />
          )}
        </KpiGrid>
      </CardContent>
    </Card>
  );
}
