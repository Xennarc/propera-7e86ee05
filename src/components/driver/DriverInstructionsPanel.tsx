import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, MapPin, MapPinOff, Users } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TripRequestWithDetails } from '@/hooks/transport/useTripDetails';

export interface DriverInstructionsPanelProps {
  tripRequests: TripRequestWithDetails[] | undefined | null;
  className?: string;
}

/**
 * Collapsible panel showing special instructions for all passengers in a trip.
 * Only renders if at least one request has notes, pickup_text, or dropoff_text.
 */
export function DriverInstructionsPanel({
  tripRequests,
  className,
}: DriverInstructionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter requests that have any special instructions
  const requestsWithInstructions = (tripRequests || []).filter(
    (req) => req.notes || req.pickup_text || req.dropoff_text
  );

  // Don't render anything if no instructions exist
  if (requestsWithInstructions.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-amber-500/30 bg-amber-500/5', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-amber-500/10 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-700 dark:text-amber-300">
                  Special Instructions
                </span>
                <Badge variant="outline" className="ml-1 text-amber-600 border-amber-500/50">
                  {requestsWithInstructions.length}
                </Badge>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {requestsWithInstructions.map((req) => (
              <RequestInstructionItem key={req.id} request={req} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface RequestInstructionItemProps {
  request: TripRequestWithDetails;
}

function RequestInstructionItem({ request }: RequestInstructionItemProps) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border/50 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {request.guest_name || 'Guest'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{request.party_size} pax</span>
            {request.room_number && (
              <>
                <span>•</span>
                <span>Room {request.room_number}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {request.notes && (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Notes
          </p>
          <p className="text-foreground whitespace-pre-wrap break-words">
            {request.notes}
          </p>
        </div>
      )}

      {/* Pickup/Dropoff Text */}
      {(request.pickup_text || request.dropoff_text) && (
        <div className="flex flex-col gap-1.5 text-sm">
          {request.pickup_text && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{request.pickup_text}</span>
            </div>
          )}
          {request.dropoff_text && (
            <div className="flex items-start gap-2">
              <MapPinOff className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{request.dropoff_text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
