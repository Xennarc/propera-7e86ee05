import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { HistoryFilterBar } from './HistoryFilterBar';
import { RequestHistoryList } from './RequestHistoryList';
import { TripHistoryList } from './TripHistoryList';
import { RequestHistorySheet } from './RequestHistorySheet';
import { TripHistorySheet } from './TripHistorySheet';
import { ClipboardList, Car } from 'lucide-react';

interface TransportHistoryTabProps {
  resortId: string | undefined;
}

type HistoryMode = 'requests' | 'trips';

export function TransportHistoryTab({ resortId }: TransportHistoryTabProps) {
  const [mode, setMode] = useState<HistoryMode>('requests');
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
  
  // Transform drivers for filter dropdown
  const driverOptions = drivers.map(d => ({
    user_id: d.user_id,
    display_name: d.full_name || 'Unknown Driver',
  }));
  
  return (
    <div className="h-full flex flex-col">
      {/* Mode tabs */}
      <div className="p-4 border-b">
        <Tabs value={mode} onValueChange={(v) => setMode(v as HistoryMode)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="requests" className="flex-1 sm:flex-none gap-2">
              <ClipboardList className="h-4 w-4" />
              Requests
              {requestHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {requestHistory.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex-1 sm:flex-none gap-2">
              <Car className="h-4 w-4" />
              Trips
              {tripHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {tripHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Filter bar - sticky on mobile */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <HistoryFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          zones={zones}
          drivers={driverOptions}
          buggies={buggies}
          mode={mode}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'requests' ? (
          <RequestHistoryList
            requests={requestHistory}
            isLoading={requestsLoading}
            onSelectRequest={setSelectedRequest}
            selectedId={selectedRequest?.id}
          />
        ) : (
          <TripHistoryList
            trips={tripHistory}
            isLoading={tripsLoading}
            onSelectTrip={setSelectedTrip}
            selectedId={selectedTrip?.id}
          />
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
