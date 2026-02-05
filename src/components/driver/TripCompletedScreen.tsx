import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripCompletedScreenProps {
  tripId: string;
  stopsCount: number;
  passengersCount: number;
  durationMinutes?: number;
  onGoHome: () => void;
}

export function TripCompletedScreen({
  tripId,
  stopsCount,
  passengersCount,
  durationMinutes,
  onGoHome,
}: TripCompletedScreenProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [showAnimation, setShowAnimation] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      onGoHome();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onGoHome]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Success Animation */}
      <div
        className={cn(
          'transition-all duration-700 ease-out',
          showAnimation
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-75'
        )}
      >
        <div className="relative">
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute h-32 w-32 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="absolute h-24 w-24 rounded-full bg-emerald-500/30 animate-pulse" />
          </div>
          
          {/* Checkmark icon */}
          <div className="relative h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-14 w-14 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h1
        className={cn(
          'text-2xl font-bold mt-8 transition-all duration-500 delay-300',
          showAnimation
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        )}
      >
        Trip Completed!
      </h1>
      <p
        className={cn(
          'text-muted-foreground mt-2 transition-all duration-500 delay-400',
          showAnimation
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        )}
      >
        Great work, driver!
      </p>

      {/* Stats Cards */}
      <Card
        className={cn(
          'w-full max-w-sm mt-8 transition-all duration-500 delay-500',
          showAnimation
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        )}
      >
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xl font-bold">{stopsCount}</p>
              <p className="text-xs text-muted-foreground">stops</p>
            </div>
            <div className="space-y-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xl font-bold">{passengersCount}</p>
              <p className="text-xs text-muted-foreground">guests</p>
            </div>
            <div className="space-y-1">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xl font-bold">
                {durationMinutes ? formatDuration(durationMinutes) : '--'}
              </p>
              <p className="text-xs text-muted-foreground">duration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div
        className={cn(
          'w-full max-w-sm mt-8 space-y-3 transition-all duration-500 delay-700',
          showAnimation
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        )}
      >
        <Button
          size="lg"
          className="w-full h-14 text-base"
          onClick={onGoHome}
        >
          Back to Home
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/driver/history`)}
        >
          View Trip History
        </Button>
      </div>

      {/* Countdown */}
      <p
        className={cn(
          'text-sm text-muted-foreground mt-6 transition-all duration-500 delay-700',
          showAnimation
            ? 'opacity-100'
            : 'opacity-0'
        )}
      >
        Redirecting in {countdown}s...
      </p>
    </div>
  );
}
