import { Badge } from '@/components/ui/badge';
import { 
  IconActivities, 
  IconRestaurants, 
  IconBookings 
} from '@/components/icons/ProperaIcons';
import { Compass, Waves, Sun, Sparkles } from 'lucide-react';

const sampleBookings = [
  {
    id: '1',
    title: 'Snorkel Safari',
    time: '09:30',
    status: 'confirmed',
    icon: Waves,
    colorClass: 'text-lagoon',
    bgClass: 'bg-lagoon/10',
  },
  {
    id: '2',
    title: 'Sunset Cruise',
    time: '17:00',
    status: 'pending',
    icon: Sun,
    colorClass: 'text-sunset',
    bgClass: 'bg-sunset/10',
  },
  {
    id: '3',
    title: 'Couples Massage',
    time: '14:00',
    status: 'confirmed',
    icon: Sparkles,
    colorClass: 'text-orchid',
    bgClass: 'bg-orchid/10',
  },
];

const quickActions = [
  { icon: IconActivities, label: 'Activities', colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10' },
  { icon: IconRestaurants, label: 'Dining', colorClass: 'text-sunset', bgClass: 'bg-sunset/10' },
  { icon: IconBookings, label: 'Bookings', colorClass: 'text-orchid', bgClass: 'bg-orchid/10' },
  { icon: Compass, label: 'Explore', colorClass: 'text-primary', bgClass: 'bg-primary/10' },
];

export function MobileGuestShowcase() {
  return (
    <div className="relative mx-auto w-[200px] sm:w-[220px]">
      {/* Phone frame */}
      <div className="relative bg-card/95 backdrop-blur-xl rounded-[28px] border-2 border-border/60 shadow-elevated overflow-hidden">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-5 bg-background rounded-full z-10" />
        
        {/* Screen content */}
        <div className="pt-8 pb-4 px-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <IconBookings className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">My Bookings</span>
          </div>
          
          {/* Booking cards */}
          <div className="space-y-2">
            {sampleBookings.map((booking) => {
              const Icon = booking.icon;
              return (
                <div 
                  key={booking.id}
                  className="flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-card/80"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${booking.bgClass}`}>
                    <Icon className={`h-4 w-4 ${booking.colorClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">
                      {booking.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {booking.time}
                    </p>
                  </div>
                  <Badge 
                    variant={booking.status === 'confirmed' ? 'confirmed' : 'pending'}
                    className="text-[8px] px-1.5 py-0.5 h-auto"
                  >
                    {booking.status === 'confirmed' ? '✓' : '○'}
                  </Badge>
                </div>
              );
            })}
          </div>
          
          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.label}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl ${action.bgClass}`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${action.bgClass}`}>
                    <Icon className={`h-3 w-3 ${action.colorClass}`} />
                  </div>
                  <span className={`text-[8px] font-medium ${action.colorClass}`}>
                    {action.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-16 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
      
      {/* Decorative glow - hidden on smallest screens */}
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-lagoon/5 to-sunset/5 rounded-3xl blur-xl -z-10 hidden sm:block" />
    </div>
  );
}
