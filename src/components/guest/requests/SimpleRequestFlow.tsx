import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { toast } from 'sonner';
import { 
  Send, 
  Clock, 
  Zap, 
  ClipboardList,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useServiceRequestMutations } from '@/hooks/useServiceRequests';
import { useRequestSettings, formatResponseTime, DEFAULT_REQUEST_SETTINGS } from '@/hooks/useRequestSettings';
import { format, addMinutes, startOfDay, setHours, setMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface SimpleRequestFlowProps {
  guestId: string;
  resortId: string;
  resortTimezone?: string;
}

export function SimpleRequestFlow({ guestId, resortId, resortTimezone }: SimpleRequestFlowProps) {
  const [requestText, setRequestText] = useState('');
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { createRequest, isCreating } = useServiceRequestMutations(guestId, resortId);
  const { settings } = useRequestSettings(resortId);

  // Generate time slots for scheduling using dynamic settings
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startHour = settings.requestsStartHour;
    const endHour = settings.requestsEndHour;
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, [settings.requestsStartHour, settings.requestsEndHour]);

  // Build scheduled datetime
  const getScheduledDateTime = () => {
    if (isAsap) return undefined;
    
    const tz = resortTimezone || 'UTC';
    const now = toZonedTime(new Date(), tz);
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    
    let scheduledDate = setMinutes(setHours(startOfDay(now), hours), minutes);
    
    // If time is in the past, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate = addMinutes(scheduledDate, 24 * 60);
    }
    
    return scheduledDate.toISOString();
  };

  const handleSubmit = async () => {
    if (!requestText.trim()) {
      toast.error('Please describe your request');
      return;
    }

    try {
      await createRequest({
        guestId,
        resortId,
        title: requestText.trim(),
        isAsap,
        requestedForAt: getScheduledDateTime(),
        departmentKey: 'FRONT_OFFICE', // Universal fallback for unconfigured resorts
        category: 'OTHER',
      });
      
      // Show success state
      setShowSuccess(true);
      setRequestText('');
      setIsAsap(true);
      
      // Reset success after animation
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setRequestText(suggestion);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How can we help?
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us what you need and our team will take care of it
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/guest/requests/my">
            <ClipboardList className="h-4 w-4" />
            My Requests
          </Link>
        </Button>
      </motion.div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="flex flex-col items-center gap-4 p-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 10 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-semibold text-foreground"
              >
                Request Sent!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground text-center"
              >
                Our team has been notified and will assist you shortly
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Request Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border bg-card p-5 shadow-sm space-y-5"
      >
        {/* Request Input */}
        <div className="space-y-2">
          <Label htmlFor="request-text" className="text-sm font-medium">
            What do you need?
          </Label>
          <Textarea
            id="request-text"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="e.g., Extra towels, room cleaning, wake-up call at 7am..."
            rows={4}
            className="text-base resize-none" // 16px prevents iOS zoom
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {requestText.length}/500
          </p>
        </div>

        {/* Quick Suggestions - Dynamic from settings */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Quick suggestions
          </Label>
          <div className="flex flex-wrap gap-2">
            {settings.quickSuggestions.map((suggestion) => (
              <motion.button
                key={suggestion}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  'border hover:border-primary/50',
                  requestText === suggestion
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-foreground hover:bg-muted'
                )}
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Timing Toggle */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">When do you need this?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isAsap ? 'default' : 'outline'}
              className={cn(
                'flex-1 gap-2 min-h-[48px] transition-all duration-200',
                isAsap && 'shadow-md'
              )}
              onClick={() => setIsAsap(true)}
            >
              <Zap className="h-4 w-4" />
              As soon as possible
            </Button>
            <Button
              type="button"
              variant={!isAsap ? 'default' : 'outline'}
              className={cn(
                'flex-1 gap-2 min-h-[48px] transition-all duration-200',
                !isAsap && 'shadow-md'
              )}
              onClick={() => setIsAsap(false)}
            >
              <Clock className="h-4 w-4" />
              Schedule
            </Button>
          </div>

          {/* Time Picker (shown when scheduled) */}
          <AnimatePresence>
            {!isAsap && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  <Label htmlFor="scheduled-time" className="text-sm text-muted-foreground">
                    Select time (today or tomorrow)
                  </Label>
                  <select
                    id="scheduled-time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={cn(
                      'w-full h-12 px-4 rounded-xl border bg-background',
                      'text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    )}
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {format(setMinutes(setHours(new Date(), parseInt(slot.split(':')[0])), parseInt(slot.split(':')[1])), 'h:mm a')}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!requestText.trim() || isCreating}
          className="w-full min-h-[52px] text-base font-semibold gap-2 shadow-lg"
          size="lg"
        >
          {isCreating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-5 w-5 border-2 border-current border-t-transparent rounded-full"
              />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Send Request
            </>
          )}
        </Button>
      </motion.div>

      {/* Info Footer - Dynamic response time */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs text-muted-foreground px-4"
      >
        {formatResponseTime(settings.footerResponseText, settings.asapResponseMin, settings.asapResponseMax)}
      </motion.p>
    </div>
  );
}
