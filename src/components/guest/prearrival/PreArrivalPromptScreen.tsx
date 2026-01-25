import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, ChevronRight, Plane, Calendar } from 'lucide-react';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import type { PrearrivalSettings } from '@/hooks/usePrearrivalData';

interface PreArrivalPromptScreenProps {
  onComplete: () => void;
  onSkip: () => void;
  guestFirstName: string;
  checkInDate: string;
  settings: PrearrivalSettings | undefined;
  resortName?: string;
  resortLogoUrl?: string;
}

export function PreArrivalPromptScreen({
  onComplete,
  onSkip,
  guestFirstName,
  checkInDate,
  settings,
  resortName,
  resortLogoUrl,
}: PreArrivalPromptScreenProps) {
  // Calculate days until arrival
  const today = new Date();
  const checkIn = parseISO(checkInDate);
  const daysUntil = differenceInDays(checkIn, today);

  // Get welcome message from settings or use default
  const welcomeMessage = settings?.welcome_message || 
    'Help us prepare for your arrival by sharing a few preferences.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardContent className="p-6 space-y-6">
          {/* Resort Branding */}
          <div className="flex flex-col items-center text-center space-y-4">
            {resortLogoUrl ? (
              <img 
                src={resortLogoUrl} 
                alt={resortName || 'Resort'} 
                className="h-16 w-16 object-contain rounded-xl"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <ProperaMark size={40} className="text-primary" />
              </div>
            )}
            
            {resortName && (
              <p className="text-sm text-muted-foreground font-medium">
                {resortName}
              </p>
            )}
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome, {guestFirstName}!
            </h1>
            
            {/* Days until arrival */}
            <div className="flex items-center justify-center gap-2 text-primary">
              <Plane className="h-5 w-5" />
              <span className="font-semibold">
                {daysUntil === 0 
                  ? 'Your stay begins today!'
                  : daysUntil === 1 
                  ? 'Your stay begins tomorrow!'
                  : `Your stay begins in ${daysUntil} days`}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="text-center">
            <p className="text-muted-foreground">
              {welcomeMessage}
            </p>
          </div>

          {/* Pre-arrival benefits */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardCheck className="h-4 w-4 text-primary" />
              </div>
              <span className="text-muted-foreground">Share dietary preferences & allergies</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Plane className="h-4 w-4 text-primary" />
              </div>
              <span className="text-muted-foreground">Provide arrival details & transfer preferences</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <span className="text-muted-foreground">Let us know about special occasions</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button 
              onClick={onComplete} 
              className="w-full h-12 text-base font-semibold"
            >
              Complete Pre-Arrival
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            
            <button
              onClick={onSkip}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* Time estimate */}
          <p className="text-xs text-center text-muted-foreground">
            Takes about 2 minutes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
