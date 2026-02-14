import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  UserX, 
  Users, 
  TrendingUp,
  Car,
  MapPin,
} from 'lucide-react';
import type { TransportMetrics, TripMetrics } from '@/hooks/transport/useTransportMetrics';

interface TransportMetricsCardsProps {
  requestMetrics: TransportMetrics;
  tripMetrics: TripMetrics;
}

export function TransportMetricsCards({ requestMetrics, tripMetrics }: TransportMetricsCardsProps) {
  return (
    <KpiGrid>
      <KpiCard
        label="Avg Wait Time"
        value={`${requestMetrics.avgWaitTimeMinutes}m`}
        icon={Clock}
        variant="primary"
        helperText={`${requestMetrics.minWaitTimeMinutes}m - ${requestMetrics.maxWaitTimeMinutes}m range`}
      />
      <KpiCard
        label="Completion Rate"
        value={`${requestMetrics.completionRate.toFixed(1)}%`}
        icon={CheckCircle2}
        variant={requestMetrics.completionRate >= 90 ? 'success' : requestMetrics.completionRate >= 70 ? 'warning' : 'destructive'}
        helperText={`${requestMetrics.completedRequests} of ${requestMetrics.totalRequests}`}
      />
      <KpiCard
        label="Cancellations"
        value={requestMetrics.cancelledRequests}
        icon={XCircle}
        variant={requestMetrics.cancellationRate <= 10 ? 'default' : 'warning'}
        helperText={`${requestMetrics.cancellationRate.toFixed(1)}% of requests`}
      />
      <KpiCard
        label="No-Shows"
        value={requestMetrics.noShowRequests}
        icon={UserX}
        variant={requestMetrics.noShowRate <= 5 ? 'default' : 'destructive'}
        helperText={`${requestMetrics.noShowRate.toFixed(1)}% of requests`}
      />
      <KpiCard
        label="Total Passengers"
        value={requestMetrics.totalPassengers.toLocaleString()}
        icon={Users}
        variant="primary"
        helperText={`Avg ${requestMetrics.avgPartySize.toFixed(1)} per request`}
      />
      <KpiCard
        label="Trips Completed"
        value={tripMetrics.totalTrips}
        icon={Car}
        variant="primary"
        helperText={`${tripMetrics.avgRequestsPerTrip} reqs/trip avg`}
      />
      <KpiCard
        label="Avg Trip Duration"
        value={`${tripMetrics.avgTripDurationMinutes}m`}
        icon={TrendingUp}
        variant="primary"
        helperText={`${tripMetrics.totalStops} total stops`}
      />
      <KpiCard
        label="Stops per Trip"
        value={tripMetrics.avgStopsPerTrip.toFixed(1)}
        icon={MapPin}
        helperText="Average stops"
      />
    </KpiGrid>
  );
}
