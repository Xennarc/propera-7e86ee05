/**
 * PickupPlanCard – Setup tab card for managing session pickup runs.
 * Shows current linked trip status, or a button to generate a new one.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { MapPin, Bus, Loader2, Users, ChevronRight } from 'lucide-react';
import { useSessionPickupTrip, useGeneratePickupTrip, type PickupGuest } from '@/hooks/useSessionPickup';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PickupPlanCardProps {
  sessionId: string;
  resortId: string;
  activityName: string;
  sessionTime: string; // e.g. "09:00"
  /** Guests from manifest – used to pre-populate pickup list */
  guests: Array<{
    bookingId: string;
    guestId: string;
    guestName: string;
    roomNumber: string;
    partySize: number;
  }>;
}

const TRIP_STATUS_MAP: Record<string, string> = {
  planning: 'Planning',
  assigned: 'Driver Assigned',
  en_route: 'En Route',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function PickupPlanCard({ sessionId, resortId, activityName, sessionTime, guests }: PickupPlanCardProps) {
  const { data: linkedTrip, isLoading } = useSessionPickupTrip(sessionId, resortId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Pickup Plan</h3>
          </div>
          {linkedTrip && (
            <Badge variant="outline" className="text-xs">
              {TRIP_STATUS_MAP[linkedTrip.status] ?? linkedTrip.status}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="h-10 flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : linkedTrip ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-muted/30 border border-border/40 p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">{linkedTrip.notes}</p>
              <p className="text-xs text-muted-foreground">
                {linkedTrip.stop_count} stops · {linkedTrip.buggy_name ? `Buggy: ${linkedTrip.buggy_name}` : 'No buggy assigned'}
              </p>
              {linkedTrip.driver_user_id && (
                <p className="text-xs text-success">Driver assigned</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/staff/transport`)}
            >
              View in Dispatch
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              No pickup run created yet. Generate one from the manifest.
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => setDrawerOpen(true)}
              disabled={guests.length === 0}
            >
              <MapPin className="h-4 w-4 mr-1.5" />
              Generate Pickup Run
            </Button>
          </div>
        )}
      </CardContent>

      <GeneratePickupDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sessionId={sessionId}
        resortId={resortId}
        activityName={activityName}
        sessionTime={sessionTime}
        guests={guests}
      />
    </Card>
  );
}

// ── Generate Pickup Drawer ─────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  resortId: string;
  activityName: string;
  sessionTime: string;
  guests: Array<{
    bookingId: string;
    guestId: string;
    guestName: string;
    roomNumber: string;
    partySize: number;
  }>;
}

function GeneratePickupDrawer({ open, onOpenChange, sessionId, resortId, activityName, sessionTime, guests }: DrawerProps) {
  const generateMutation = useGeneratePickupTrip();
  
  const [pickupGuests, setPickupGuests] = useState<PickupGuest[]>([]);
  const [meetingPoint, setMeetingPoint] = useState('Activity Center');
  const [pickupWindowStart, setPickupWindowStart] = useState('');

  // Initialize pickup guests when drawer opens
  useMemo(() => {
    if (open && pickupGuests.length === 0 && guests.length > 0) {
      setPickupGuests(guests.map(g => ({
        ...g,
        pickupLocation: `Room ${g.roomNumber}`,
        included: true,
      })));
      // Default pickup window: 30 min before session time
      if (sessionTime) {
        const [h, m] = sessionTime.split(':').map(Number);
        const pickupMin = (h * 60 + m) - 30;
        const ph = Math.floor(pickupMin / 60);
        const pm = pickupMin % 60;
        setPickupWindowStart(`${String(ph).padStart(2, '0')}:${String(pm).padStart(2, '0')}`);
      }
    }
  }, [open, guests]);

  const toggleGuest = (bookingId: string) => {
    setPickupGuests(prev => prev.map(g =>
      g.bookingId === bookingId ? { ...g, included: !g.included } : g
    ));
  };

  const includedCount = pickupGuests.filter(g => g.included).length;
  const totalPax = pickupGuests.filter(g => g.included).reduce((s, g) => s + g.partySize, 0);

  // Group by location for preview
  const locationGroups = useMemo(() => {
    const groups = new Map<string, PickupGuest[]>();
    for (const g of pickupGuests.filter(g => g.included)) {
      const loc = g.pickupLocation;
      const group = groups.get(loc) || [];
      group.push(g);
      groups.set(loc, group);
    }
    return groups;
  }, [pickupGuests]);

  const handleCreate = () => {
    generateMutation.mutate(
      {
        sessionId,
        resortId,
        activityName,
        sessionTime,
        meetingPoint,
        guests: pickupGuests,
        pickupWindowStart,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPickupGuests([]);
        },
      }
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Bus className="h-4 w-4 text-primary" />
            Generate Pickup Run
          </DrawerTitle>
          <DrawerDescription>
            {activityName} · {sessionTime}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Meeting point */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Meeting point (dropoff)</label>
            <Input
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="e.g. Dive Center, Marina"
              className="text-base"
            />
          </div>

          {/* Pickup window */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Pickup starts at</label>
            <Input
              type="time"
              value={pickupWindowStart}
              onChange={(e) => setPickupWindowStart(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Guest list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Guests</p>
              <p className="text-xs text-muted-foreground">
                {includedCount} selected · {totalPax} pax
              </p>
            </div>
            <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
              {pickupGuests.map(g => (
                <div
                  key={g.bookingId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                    g.included ? 'border-primary/30 bg-primary/5' : 'border-border/40 bg-card opacity-60'
                  )}
                >
                  <Checkbox
                    checked={g.included}
                    onCheckedChange={() => toggleGuest(g.bookingId)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{g.guestName}</p>
                    <p className="text-xs text-muted-foreground">
                      Room {g.roomNumber} · {g.partySize} pax
                    </p>
                  </div>
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Route preview */}
          {locationGroups.size > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Route preview</p>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1">
                {[...locationGroups.entries()].map(([loc, guestsAtLoc], i) => (
                  <div key={loc} className="flex items-center gap-2 text-xs">
                    <span className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-foreground">{loc}</span>
                    <span className="text-muted-foreground">({guestsAtLoc.reduce((s, g) => s + g.partySize, 0)} pax)</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-5 w-5 rounded-full bg-success/15 text-success flex items-center justify-center text-[10px] font-bold shrink-0">
                    ✓
                  </span>
                  <span className="text-foreground font-medium">{meetingPoint}</span>
                </div>
              </div>
            </div>
          )}

          {/* Create */}
          <Button
            className="w-full h-12 text-base"
            disabled={includedCount === 0 || !meetingPoint.trim() || generateMutation.isPending}
            onClick={handleCreate}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bus className="h-4 w-4 mr-2" />
            )}
            Create Pickup Trip ({totalPax} pax, {locationGroups.size} stops)
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
