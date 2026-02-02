import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, Car, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import type { RequestHistoryRow, TripHistoryRow } from '@/hooks/transport/useTransportHistory';

interface TransportHistoryExportProps {
  requests: RequestHistoryRow[];
  trips: TripHistoryRow[];
  dateRange: { from: Date; to: Date };
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function TransportHistoryExport({ requests, trips, dateRange }: TransportHistoryExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportRequests = () => {
    setIsExporting(true);
    
    const headers = [
      'ID',
      'Date',
      'Time',
      'Status',
      'Type',
      'Source',
      'Priority',
      'Guest Name',
      'Room',
      'Party Size',
      'Pickup',
      'Pickup Zone',
      'Dropoff',
      'Dropoff Zone',
    ];
    
    const rows = requests.map(r => [
      r.id,
      format(new Date(r.created_at), 'yyyy-MM-dd'),
      format(new Date(r.created_at), 'HH:mm'),
      r.status,
      r.request_type,
      r.request_source,
      r.priority,
      r.guest_name || '',
      r.room_number || '',
      r.party_size,
      r.pickup_stop_name || r.pickup_text || '',
      r.pickup_zone || '',
      r.dropoff_stop_name || r.dropoff_text || '',
      r.dropoff_zone || '',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');
    
    const filename = `transport-requests_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    downloadCSV(filename, csv);
    
    setIsExporting(false);
  };

  const handleExportTrips = () => {
    setIsExporting(true);
    
    const headers = [
      'ID',
      'Date',
      'Start Time',
      'End Time',
      'Duration (min)',
      'Status',
      'Type',
      'Buggy',
      'Driver',
      'Requests',
      'Stops',
      'Passengers',
    ];
    
    const rows = trips.map(t => {
      const startTime = t.start_at ? format(new Date(t.start_at), 'HH:mm') : '';
      const endTime = t.end_at ? format(new Date(t.end_at), 'HH:mm') : '';
      const duration = t.start_at && t.end_at 
        ? Math.round((new Date(t.end_at).getTime() - new Date(t.start_at).getTime()) / 60000)
        : '';
      
      return [
        t.id,
        format(new Date(t.created_at), 'yyyy-MM-dd'),
        startTime,
        endTime,
        duration,
        t.status,
        t.trip_type,
        t.buggy_name || '',
        t.driver_name || '',
        t.request_count,
        t.stop_count,
        t.capacity_total || '',
      ];
    });
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');
    
    const filename = `transport-trips_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    downloadCSV(filename, csv);
    
    setIsExporting(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportRequests} disabled={requests.length === 0}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Requests ({requests.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportTrips} disabled={trips.length === 0}>
          <Car className="h-4 w-4 mr-2" />
          Trips ({trips.length})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
