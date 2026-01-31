import { useState, useCallback } from 'react';
import { format, addHours, roundToNearestMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Clock, Calendar, Users, Accessibility, Route, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NumberStepper } from '@/components/ui/number-stepper';
import { BuggyStopPicker } from './BuggyStopPicker';
import { cn } from '@/lib/utils';
import type { BuggyRequestType } from '@/types/database';

interface BuggyStop {
  id: string;
  name: string;
  zone: string | null;
  sort_order: number;
}

interface BuggyRoute {
  id: string;
  name: string;
  color_tag: string | null;
  route_stops: Array<{ stop: { id: string; name: string } }>;
}

type RequestMode = 'on_demand' | 'scheduled' | 'fixed_route';

interface BuggyRequestFormProps {
  stops: BuggyStop[];
  routes: BuggyRoute[];
  onSubmit: (data: {
    requestType: BuggyRequestType;
    partySize: number;
    pickupStopId: string | null;
    pickupText: string | null;
    dropoffStopId: string | null;
    dropoffText: string | null;
    scheduledFor: string | null;
    routeId: string | null;
    needsAccessible: boolean;
  }) => void;
  isSubmitting: boolean;
  hasActiveRide: boolean;
}

export function BuggyRequestForm({
  stops,
  routes,
  onSubmit,
  isSubmitting,
  hasActiveRide,
}: BuggyRequestFormProps) {
  const [mode, setMode] = useState<RequestMode>('on_demand');
  const [partySize, setPartySize] = useState(1);
  const [needsAccessible, setNeedsAccessible] = useState(false);
  
  // Pickup/Dropoff state
  const [pickupStopId, setPickupStopId] = useState<string | null>(null);
  const [pickupText, setPickupText] = useState('');
  const [pickupIsOther, setPickupIsOther] = useState(false);
  
  const [dropoffStopId, setDropoffStopId] = useState<string | null>(null);
  const [dropoffText, setDropoffText] = useState('');
  const [dropoffIsOther, setDropoffIsOther] = useState(false);
  
  // Scheduled time
  const [scheduledTime, setScheduledTime] = useState(() => {
    const rounded = roundToNearestMinutes(addHours(new Date(), 1), { nearestTo: 15 });
    return format(rounded, "yyyy-MM-dd'T'HH:mm");
  });
  
  // Fixed route
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  
  const handlePickupChange = useCallback((stopId: string | null, isOther: boolean, text?: string) => {
    setPickupStopId(stopId);
    setPickupIsOther(isOther);
    if (text !== undefined) setPickupText(text);
  }, []);
  
  const handleDropoffChange = useCallback((stopId: string | null, isOther: boolean, text?: string) => {
    setDropoffStopId(stopId);
    setDropoffIsOther(isOther);
    if (text !== undefined) setDropoffText(text);
  }, []);

  const handleSubmit = () => {
    onSubmit({
      requestType: mode,
      partySize,
      pickupStopId: pickupIsOther ? null : pickupStopId,
      pickupText: pickupIsOther ? pickupText : null,
      dropoffStopId: dropoffIsOther ? null : dropoffStopId,
      dropoffText: dropoffIsOther ? dropoffText : null,
      scheduledFor: mode === 'scheduled' ? new Date(scheduledTime).toISOString() : null,
      routeId: mode === 'fixed_route' ? selectedRouteId : null,
      needsAccessible,
    });
  };

  // Validation
  const isPickupValid = pickupStopId || (pickupIsOther && pickupText.trim().length > 0);
  const isDropoffValid = mode === 'fixed_route' || dropoffStopId || (dropoffIsOther && dropoffText.trim().length > 0);
  const isRouteValid = mode !== 'fixed_route' || selectedRouteId;
  const isScheduleValid = mode !== 'scheduled' || scheduledTime;
  const isFormValid = isPickupValid && isDropoffValid && isRouteValid && isScheduleValid && partySize >= 1;

  const hasRoutes = routes.length > 0;

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">When do you need a ride?</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === 'on_demand' ? 'default' : 'outline'}
            className={cn(
              "h-14 flex-col gap-1",
              mode === 'on_demand' && "shadow-md shadow-primary/20"
            )}
            onClick={() => setMode('on_demand')}
          >
            <Car className="h-5 w-5" />
            <span className="text-xs">Pick me up now</span>
          </Button>
          <Button
            type="button"
            variant={mode === 'scheduled' ? 'default' : 'outline'}
            className={cn(
              "h-14 flex-col gap-1",
              mode === 'scheduled' && "shadow-md shadow-primary/20"
            )}
            onClick={() => setMode('scheduled')}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Schedule a ride</span>
          </Button>
        </div>
        
        {hasRoutes && (
          <Button
            type="button"
            variant={mode === 'fixed_route' ? 'default' : 'outline'}
            className={cn(
              "w-full h-12 gap-2",
              mode === 'fixed_route' && "shadow-md shadow-primary/20"
            )}
            onClick={() => setMode('fixed_route')}
          >
            <Route className="h-5 w-5" />
            <span>Join a shuttle route</span>
          </Button>
        )}
      </div>

      {/* Scheduled Time */}
      <AnimatePresence mode="wait">
        {mode === 'scheduled' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pick-up time</Label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                className="h-12"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Route Selector */}
      <AnimatePresence mode="wait">
        {mode === 'fixed_route' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select route</Label>
              <div className="space-y-2">
                {routes.map(route => (
                  <Button
                    key={route.id}
                    type="button"
                    variant={selectedRouteId === route.id ? 'default' : 'outline'}
                    className={cn(
                      "w-full h-auto py-3 justify-start text-left",
                      selectedRouteId === route.id && "shadow-md shadow-primary/20"
                    )}
                    onClick={() => setSelectedRouteId(route.id)}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-semibold">{route.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {route.route_stops.map(rs => rs.stop?.name).filter(Boolean).join(' → ')}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pickup Location */}
      <BuggyStopPicker
        stops={stops}
        value={pickupStopId}
        onChange={handlePickupChange}
        label="Pick-up location"
        placeholder="Where should we pick you up?"
        otherValue={pickupText}
        onOtherChange={setPickupText}
        disabled={isSubmitting}
      />

      {/* Dropoff Location (not for fixed route) */}
      {mode !== 'fixed_route' && (
        <BuggyStopPicker
          stops={stops}
          value={dropoffStopId}
          onChange={handleDropoffChange}
          label="Drop-off location"
          placeholder="Where are you going?"
          otherValue={dropoffText}
          onOtherChange={setDropoffText}
          disabled={isSubmitting}
        />
      )}

      {/* Party Size */}
      <div className="space-y-2">
        <NumberStepper
          value={partySize}
          onChange={setPartySize}
          min={1}
          max={12}
          label="Number of passengers"
          disabled={isSubmitting}
        />
      </div>

      {/* Accessibility Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/50">
        <div className="flex items-center gap-3">
          <Accessibility className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Wheelchair accessible</p>
            <p className="text-xs text-muted-foreground">Request an accessible buggy</p>
          </div>
        </div>
        <Switch
          checked={needsAccessible}
          onCheckedChange={setNeedsAccessible}
          disabled={isSubmitting}
        />
      </div>

      {/* Active Ride Warning */}
      {hasActiveRide && (
        <Alert variant="destructive">
          <AlertDescription>
            You already have an active ride request. Please wait for it to complete or cancel it first.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isFormValid || isSubmitting || hasActiveRide}
        className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/25"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Requesting...
          </>
        ) : mode === 'on_demand' ? (
          'Request Pickup Now'
        ) : mode === 'scheduled' ? (
          'Schedule Ride'
        ) : (
          'Join Route'
        )}
      </Button>
    </div>
  );
}
