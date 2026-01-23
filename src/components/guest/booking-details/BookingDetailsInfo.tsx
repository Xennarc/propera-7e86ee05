import { Hash, MapPin, User, Clock, MessageSquare, Utensils, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { BookingDisplayModel, BookingDetailsExtended } from '@/types/booking-display';

interface BookingDetailsInfoProps {
  booking: BookingDisplayModel;
  extendedDetails?: BookingDetailsExtended | null;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function BookingDetailsInfo({ booking, extendedDetails }: BookingDetailsInfoProps) {
  const isActivity = booking.type === 'activity';
  
  // Format booking reference (first 8 chars of ID)
  const bookingRef = booking.id.slice(0, 8).toUpperCase();

  // Meeting point or venue
  const location = booking.meetingPoint || booking.venueName;

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground mb-2">Booking Details</h3>
      
      <div className="bg-muted/20 rounded-xl p-3 space-y-1">
        <InfoRow
          icon={Hash}
          label="Booking Reference"
          value={bookingRef}
        />

        {booking.roomNumber && (
          <InfoRow
            icon={User}
            label="Room"
            value={`Room ${booking.roomNumber}`}
          />
        )}

        {location && (
          <InfoRow
            icon={MapPin}
            label={isActivity ? "Meeting Point" : "Location"}
            value={location}
          />
        )}

        {booking.durationMinutes && (
          <InfoRow
            icon={Clock}
            label="Duration"
            value={`${booking.durationMinutes} minutes`}
          />
        )}

        {isActivity && extendedDetails?.difficultyLevel && (
          <InfoRow
            icon={Activity}
            label="Difficulty"
            value={extendedDetails.difficultyLevel}
          />
        )}

        {!isActivity && booking.mealPeriod && (
          <InfoRow
            icon={Utensils}
            label="Meal Period"
            value={booking.mealPeriod}
          />
        )}
      </div>

      {/* Guest Notes / Special Requests */}
      {(booking.guestNotes || booking.specialRequests) && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">
              {isActivity ? 'Your Notes' : 'Special Requests'}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            {booking.guestNotes || booking.specialRequests}
          </p>
        </div>
      )}

      {/* Extended Description */}
      {extendedDetails?.fullDescription && (
        <div className="mt-4">
          <Separator className="mb-4" />
          <h4 className="text-sm font-medium text-foreground mb-2">About</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {extendedDetails.fullDescription}
          </p>
        </div>
      )}

      {/* Highlights */}
      {booking.highlights && booking.highlights.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Highlights</h4>
          <ul className="space-y-1.5">
            {booking.highlights.map((highlight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-1">•</span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Includes */}
      {booking.includes && booking.includes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-2">What's Included</h4>
          <ul className="space-y-1.5">
            {booking.includes.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-emerald-500 mt-1">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Health & Safety Notes */}
      {booking.healthAndSafetyNotes && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            Health & Safety
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {booking.healthAndSafetyNotes}
          </p>
        </div>
      )}

      {/* Resource Info (boat, van, etc.) */}
      {extendedDetails?.resourceName && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-1">Equipment</h4>
          <p className="text-sm text-muted-foreground">
            {extendedDetails.resourceType && `${extendedDetails.resourceType}: `}
            {extendedDetails.resourceName}
          </p>
        </div>
      )}

      {/* Lead Staff */}
      {extendedDetails?.leadStaffName && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-1">Your Guide</h4>
          <p className="text-sm text-muted-foreground">
            {extendedDetails.leadStaffName}
          </p>
        </div>
      )}
    </div>
  );
}
