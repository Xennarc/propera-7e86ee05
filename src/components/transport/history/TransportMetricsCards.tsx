import { ReportStatCard } from '@/components/reports/ReportStatCard';
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
    <div className="w-full flex justify-center">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-6xl w-full">
      <ReportStatCard
        title="Avg Wait Time"
        value={`${requestMetrics.avgWaitTimeMinutes}m`}
        subtitle={`${requestMetrics.minWaitTimeMinutes}m - ${requestMetrics.maxWaitTimeMinutes}m range`}
        icon={<Clock className="h-5 w-5 text-primary" />}
      />
      
      <ReportStatCard
        title="Completion Rate"
        value={`${requestMetrics.completionRate.toFixed(1)}%`}
        subtitle={`${requestMetrics.completedRequests} of ${requestMetrics.totalRequests}`}
        icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        variant={requestMetrics.completionRate >= 90 ? 'success' : requestMetrics.completionRate >= 70 ? 'warning' : 'danger'}
      />
      
      <ReportStatCard
        title="Cancellations"
        value={requestMetrics.cancelledRequests.toString()}
        subtitle={`${requestMetrics.cancellationRate.toFixed(1)}% of requests`}
        icon={<XCircle className="h-5 w-5 text-amber-600" />}
        variant={requestMetrics.cancellationRate <= 10 ? 'default' : 'warning'}
      />
      
      <ReportStatCard
        title="No-Shows"
        value={requestMetrics.noShowRequests.toString()}
        subtitle={`${requestMetrics.noShowRate.toFixed(1)}% of requests`}
        icon={<UserX className="h-5 w-5 text-red-600" />}
        variant={requestMetrics.noShowRate <= 5 ? 'default' : 'danger'}
      />
      
      <ReportStatCard
        title="Total Passengers"
        value={requestMetrics.totalPassengers.toLocaleString()}
        subtitle={`Avg ${requestMetrics.avgPartySize.toFixed(1)} per request`}
        icon={<Users className="h-5 w-5 text-primary" />}
      />
      
      <ReportStatCard
        title="Trips Completed"
        value={tripMetrics.totalTrips.toString()}
        subtitle={`${tripMetrics.avgRequestsPerTrip} reqs/trip avg`}
        icon={<Car className="h-5 w-5 text-primary" />}
      />
      
      <ReportStatCard
        title="Avg Trip Duration"
        value={`${tripMetrics.avgTripDurationMinutes}m`}
        subtitle={`${tripMetrics.totalStops} total stops`}
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
      />
      
      <ReportStatCard
        title="Stops per Trip"
        value={tripMetrics.avgStopsPerTrip.toFixed(1)}
        subtitle="Average stops"
        icon={<MapPin className="h-5 w-5 text-primary" />}
      />
    </div>
    </div>
  );
}
