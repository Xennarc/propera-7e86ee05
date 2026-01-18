import { Badge } from '@/components/ui/badge';
import { 
  IconActivities, 
  IconRestaurants 
} from '@/components/icons/ProperaIcons';
import { Sun, Sunset, Moon, Sparkles } from 'lucide-react';

// Changed to "Today's Schedule" timeline to differentiate from InteractiveProductShowcase
const timelineItems = [
  {
    id: '1',
    period: 'Morning',
    title: 'Sunrise Yoga',
    time: '07:00',
    icon: Sun,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
  },
  {
    id: '2',
    period: 'Afternoon',
    title: 'Lagoon Snorkel',
    time: '14:30',
    icon: IconActivities,
    colorClass: 'text-lagoon',
    bgClass: 'bg-lagoon/10',
  },
  {
    id: '3',
    period: 'Evening',
    title: 'Sunset Dinner',
    time: '18:30',
    icon: Sunset,
    colorClass: 'text-sunset',
    bgClass: 'bg-sunset/10',
  },
];

export function MobileGuestShowcase() {
  return (
    <div className="relative mx-auto w-[180px] sm:w-[200px]">
      {/* Phone frame */}
      <div className="relative bg-card/95 backdrop-blur-xl rounded-[24px] border-2 border-border/60 shadow-elevated overflow-hidden">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-background rounded-full z-10" />
        
        {/* Screen content */}
        <div className="pt-7 pb-3 px-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">Today</span>
            </div>
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0.5 h-auto bg-primary/10 text-primary border-0">
              3 activities
            </Badge>
          </div>
          
          {/* Timeline */}
          <div className="relative pl-3">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-500/40 via-lagoon/40 to-sunset/40 rounded-full" />
            
            <div className="space-y-2">
              {timelineItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={item.id}
                    className="relative flex items-center gap-2 pl-3"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[-5px] w-2.5 h-2.5 rounded-full ${item.bgClass} border-2 border-card`} />
                    
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${item.bgClass}`}>
                      <Icon className={`h-3.5 w-3.5 ${item.colorClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {item.period} · {item.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Quick action hint */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            <span className="text-[8px] text-muted-foreground">Tap to view details</span>
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="flex justify-center pb-1.5">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
      
      {/* Decorative glow - hidden on smallest screens */}
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-lagoon/5 to-sunset/5 rounded-3xl blur-xl -z-10 hidden sm:block" />
    </div>
  );
}
