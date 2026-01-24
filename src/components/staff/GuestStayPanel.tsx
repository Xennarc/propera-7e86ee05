import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Home, Plane } from 'lucide-react';
import { safeFormatDate } from '@/lib/safe-date-format';
import { StaffGuestStay, StaffAccessLink } from '@/hooks/useStaffGuestStay';
import { StayAccessLinkManager } from './StayAccessLinkManager';

interface GuestStayPanelProps {
  guestId: string;
  guestName: string;
  resortId: string;
  stay: StaffGuestStay | null;
  accessLinks: StaffAccessLink[];
  isLoading: boolean;
  onLinkGenerated?: () => void;
}

function getStatusConfig(status: StaffGuestStay['status']) {
  switch (status) {
    case 'pre_arrival':
      return { 
        label: 'Pre-Arrival', 
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Plane
      };
    case 'in_house':
      return { 
        label: 'In-House', 
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: Home
      };
    case 'checked_out':
      return { 
        label: 'Checked Out', 
        className: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: Calendar
      };
    default:
      return { 
        label: status, 
        className: 'bg-gray-100 text-gray-600',
        icon: Calendar
      };
  }
}

export function GuestStayPanel({ 
  guestId, 
  guestName, 
  resortId, 
  stay, 
  accessLinks, 
  isLoading,
  onLinkGenerated 
}: GuestStayPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (!stay) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Current Stay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No stay record found for this guest.</p>
            <p className="text-xs mt-1">Stay records are created when guests are imported with the new system.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(stay.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Current Stay
        </CardTitle>
        <Badge variant="outline" className={statusConfig.className}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stay Details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground mb-1">Arrival</dt>
            <dd className="font-medium">{safeFormatDate(stay.arrivalDate, 'MMM d, yyyy')}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground mb-1">Departure</dt>
            <dd className="font-medium">{safeFormatDate(stay.departureDate, 'MMM d, yyyy')}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground mb-1">Room</dt>
            <dd className="font-medium font-mono">
              {stay.roomNumber || <span className="text-muted-foreground italic">Not assigned</span>}
            </dd>
          </div>
        </div>

        {/* Access Link Management - only for pre-arrival or in-house */}
        {(stay.status === 'pre_arrival' || stay.status === 'in_house') && (
          <>
            <div className="border-t pt-4" />
            <StayAccessLinkManager
              stayId={stay.id}
              guestName={guestName}
              accessLinks={accessLinks}
              onLinkGenerated={onLinkGenerated}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
