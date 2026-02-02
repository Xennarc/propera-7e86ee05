import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DayOfWeekChart } from '@/components/reports/DayOfWeekChart';
import { TransportMetricsCards } from './TransportMetricsCards';
import { TransportPeakHoursChart } from './TransportPeakHoursChart';
import { DriverPerformanceTable } from './DriverPerformanceTable';
import { TransportHistoryExport } from './TransportHistoryExport';
import { HistoryFilterBar } from './HistoryFilterBar';
import { RequestHistoryList } from './RequestHistoryList';
import { TripHistoryList } from './TripHistoryList';
import { RequestHistorySheet } from './RequestHistorySheet';
import { TripHistorySheet } from './TripHistorySheet';
import { 
  useRequestHistory, 
  useTripHistory, 
  useTransportZones,
  getDefaultHistoryFilters,
  type TransportHistoryFilters,
  type RequestHistoryRow,
  type TripHistoryRow,
} from '@/hooks/transport/useTransportHistory';
import { useBuggies, useBuggyDrivers } from '@/hooks/transport';
import { useTransportMetrics, useDriverPerformance } from '@/hooks/transport/useTransportMetrics';
import { BarChart3, ClipboardList, Car, Users } from 'lucide-react';

interface TransportReportingViewProps {
  resortId: string | undefined;
}

type ViewMode = 'metrics' | 'requests' | 'trips' | 'drivers';

export function TransportReportingView({ resortId }: TransportReportingViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('metrics');
  const [filters, setFilters] = useState<TransportHistoryFilters>(getDefaultHistoryFilters);
  
  // Selected items for sheets
  const [selectedRequest, setSelectedRequest] = useState<RequestHistoryRow | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripHistoryRow | null>(null);
  
  // Data hooks
  const { data: requestHistory = [], isLoading: requestsLoading } = useRequestHistory(resortId, filters);
  const { data: tripHistory = [], isLoading: tripsLoading } = useTripHistory(resortId, filters);
  const { data: zones = [] } = useTransportZones(resortId);
  const { data: buggies = [] } = useBuggies(resortId);
  const { data: drivers = [] } = useBuggyDrivers(resortId);
  
  // Metrics
  const { requestMetrics, tripMetrics } = useTransportMetrics(requestHistory, tripHistory);
  const driverPerformance = useDriverPerformance(tripHistory, requestHistory);
  
  // Transform drivers for filter dropdown
  const driverOptions = drivers.map(d => ({
    user_id: d.user_id,
    display_name: d.full_name || 'Unknown Driver',
  }));
  
  const isLoading = requestsLoading || tripsLoading;
  
  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs and export */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="metrics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Metrics</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Requests</span>
                {requestHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {requestHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="trips" className="gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">Trips</span>
                {tripHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {tripHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="drivers" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Drivers</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <TransportHistoryExport 
            requests={requestHistory}
            trips={tripHistory}
            dateRange={filters.dateRange}
          />
        </div>
        
        {/* Filter bar */}
        <HistoryFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          zones={zones}
          drivers={driverOptions}
          buggies={buggies}
          mode={viewMode === 'trips' || viewMode === 'drivers' ? 'trips' : 'requests'}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'metrics' && (
          <div className="space-y-4">
            <TransportMetricsCards 
              requestMetrics={requestMetrics} 
              tripMetrics={tripMetrics} 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TransportPeakHoursChart 
                data={requestMetrics.requestsByHour}
                peakHour={requestMetrics.peakHour}
              />
              <DayOfWeekChart
                title="Requests by Day"
                description={`Peak day highlighted`}
                data={requestMetrics.requestsByDay}
                valueLabel="Requests"
                highlightPeak
              />
            </div>
            
            <DriverPerformanceTable drivers={driverPerformance} />
          </div>
        )}
        
        {viewMode === 'requests' && (
          <RequestHistoryList
            requests={requestHistory}
            isLoading={isLoading}
            onSelectRequest={setSelectedRequest}
            selectedId={selectedRequest?.id}
          />
        )}
        
        {viewMode === 'trips' && (
          <TripHistoryList
            trips={tripHistory}
            isLoading={isLoading}
            onSelectTrip={setSelectedTrip}
            selectedId={selectedTrip?.id}
          />
        )}
        
        {viewMode === 'drivers' && (
          <DriverPerformanceTable drivers={driverPerformance} />
        )}
      </div>
      
      {/* Detail sheets */}
      <RequestHistorySheet
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        request={selectedRequest}
      />
      
      <TripHistorySheet
        open={!!selectedTrip}
        onOpenChange={(open) => !open && setSelectedTrip(null)}
        trip={selectedTrip}
      />
    </div>
  );
}
