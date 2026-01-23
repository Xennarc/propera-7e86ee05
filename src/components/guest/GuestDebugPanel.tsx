import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DebugBookingsData {
  activity_bookings: any[];
  restaurant_reservations: any[];
}

interface DebugFilters {
  upcoming: number;
  completed: number;
  cancelled: number;
}

interface GuestDebugPanelProps {
  guestId: string | undefined;
  resortId: string | undefined;
  resortCode: string | undefined;
  roomNumber: string | undefined;
  bookingsData: DebugBookingsData | null | undefined;
  isLoading: boolean;
  error: Error | null;
  filters: DebugFilters;
}

export function GuestDebugPanel({
  guestId,
  resortId,
  resortCode,
  roomNumber,
  bookingsData,
  isLoading,
  error,
  filters,
}: GuestDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const rawActivityCount = bookingsData?.activity_bookings?.length ?? 0;
  const rawReservationCount = bookingsData?.restaurant_reservations?.length ?? 0;
  const totalFiltered = filters.upcoming + filters.completed + filters.cancelled;

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (error) return <XCircle className="h-4 w-4 text-destructive" />;
    if (rawActivityCount > 0 || rawReservationCount > 0) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const getStatusMessage = () => {
    if (isLoading) return 'Loading...';
    if (error) return `RPC Error: ${error.message}`;
    if (rawActivityCount === 0 && rawReservationCount === 0) {
      return 'No bookings returned from RPC';
    }
    return 'Data loaded successfully';
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 shadow-lg border-amber-500/50 bg-background/95 backdrop-blur">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-medium">Debug Panel</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {resortCode === 'DEMO' ? 'DEMO' : 'DEBUG'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4 text-xs">
            {/* Auth Context */}
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground uppercase tracking-wide">
                Auth Context
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground">guest_id:</span>
                  <div className={cn(
                    "truncate",
                    guestId ? "text-foreground" : "text-destructive"
                  )}>
                    {guestId || 'MISSING'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">resort_id:</span>
                  <div className={cn(
                    "truncate",
                    resortId ? "text-foreground" : "text-destructive"
                  )}>
                    {resortId || 'MISSING'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">resort_code:</span>
                  <div className="text-foreground">{resortCode || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">room:</span>
                  <div className="text-foreground">{roomNumber || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* RPC Status */}
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground uppercase tracking-wide">
                RPC Status
              </div>
              <div className={cn(
                "px-2 py-1.5 rounded text-[11px] font-mono",
                error ? "bg-destructive/10 text-destructive" :
                isLoading ? "bg-muted" :
                rawActivityCount > 0 || rawReservationCount > 0 
                  ? "bg-emerald-500/10 text-emerald-600" 
                  : "bg-amber-500/10 text-amber-600"
              )}>
                {getStatusMessage()}
              </div>
            </div>

            {/* Raw Counts */}
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground uppercase tracking-wide">
                Raw RPC Response
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-2 py-1.5 rounded bg-muted">
                  <div className="text-muted-foreground text-[10px]">Activities</div>
                  <div className="text-lg font-semibold">{rawActivityCount}</div>
                </div>
                <div className="px-2 py-1.5 rounded bg-muted">
                  <div className="text-muted-foreground text-[10px]">Reservations</div>
                  <div className="text-lg font-semibold">{rawReservationCount}</div>
                </div>
              </div>
            </div>

            {/* Filtered Counts */}
            <div className="space-y-1.5">
              <div className="font-medium text-muted-foreground uppercase tracking-wide">
                UI Filtered Counts
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="px-2 py-1.5 rounded bg-emerald-500/10">
                  <div className="text-[10px] text-emerald-600">Upcoming</div>
                  <div className="font-semibold text-emerald-600">{filters.upcoming}</div>
                </div>
                <div className="px-2 py-1.5 rounded bg-muted">
                  <div className="text-[10px] text-muted-foreground">Completed</div>
                  <div className="font-semibold">{filters.completed}</div>
                </div>
                <div className="px-2 py-1.5 rounded bg-red-500/10">
                  <div className="text-[10px] text-red-500">Cancelled</div>
                  <div className="font-semibold text-red-500">{filters.cancelled}</div>
                </div>
              </div>
            </div>

            {/* Quick Diagnosis */}
            {!isLoading && !error && rawActivityCount === 0 && rawReservationCount === 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <div className="font-medium text-amber-600 text-[11px] mb-1">
                  Possible Issues:
                </div>
                <ul className="text-[10px] text-amber-600/80 list-disc list-inside space-y-0.5">
                  <li>No bookings seeded for this guest</li>
                  <li>guest_id mismatch between login and bookings</li>
                  <li>RLS policy blocking access</li>
                  <li>resort_id scope mismatch</li>
                </ul>
              </div>
            )}

            {/* Verification Hint */}
            <div className="text-[10px] text-muted-foreground border-t pt-2 mt-2">
              Check console for detailed debug logs. Remove ?debug=1 to hide this panel.
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
