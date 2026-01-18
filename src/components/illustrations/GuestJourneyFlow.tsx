import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Plane, Home, Search, Calendar, Sparkles, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const journeySteps = [
  { icon: Plane, label: 'Pre-arrival', action: 'Completed preferences', color: 'lagoon' },
  { icon: Home, label: 'Check-in', action: 'Room assigned', color: 'primary' },
  { icon: Search, label: 'Browse', action: 'Viewing activities', color: 'sunset' },
  { icon: Calendar, label: 'Book', action: 'Booked spa session', color: 'orchid' },
  { icon: Sparkles, label: 'Enjoy', action: 'At the pool', color: 'coral' },
  { icon: LogOut, label: 'Depart', action: 'Feedback submitted', color: 'primary' },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  lagoon: { bg: 'bg-lagoon/10', text: 'text-lagoon', border: 'border-lagoon/30' },
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  sunset: { bg: 'bg-sunset/10', text: 'text-sunset', border: 'border-sunset/30' },
  orchid: { bg: 'bg-orchid/10', text: 'text-orchid', border: 'border-orchid/30' },
  coral: { bg: 'bg-coral/10', text: 'text-coral', border: 'border-coral/30' },
};

export function GuestJourneyFlow() {
  const { ref, revealed } = useScrollReveal();

  return (
    <div className="relative py-6 md:py-8">
      {/* Connection line - desktop only */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden md:block" />
      
      {/* Static center dot - desktop only */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/40 hidden md:block" />

      <div
        ref={ref}
        className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
      >
        {/* Mobile: Vertical timeline */}
        <div className="md:hidden space-y-3 max-w-xs mx-auto">
          {journeySteps.map((step, i) => {
            const colors = colorMap[step.color];
            return (
              <div key={step.label} className="flex items-center gap-3 relative">
                {/* Connector line */}
                {i < journeySteps.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-6 bg-border/50" />
                )}
                
                {/* Icon circle */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                  colors.bg,
                  colors.border
                )}>
                  <step.icon className={cn("h-4 w-4", colors.text)} />
                </div>
                
                {/* Content */}
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{step.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{step.action}</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                    colors.bg,
                    colors.text
                  )}>
                    {i + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex flex-wrap justify-center gap-4 md:gap-0 md:justify-between relative">
          {journeySteps.map((step, i) => {
            const colors = colorMap[step.color];
            return (
              <div
                key={step.label}
                className={`flex flex-col items-center relative z-10 group stagger-${Math.min(i + 1, 7)}`}
              >
                {/* Icon circle with CSS hover */}
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full bg-card border-2 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hover:-translate-y-1",
                    colors.border,
                    colors.text
                  )}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  
                  {/* Step number */}
                  <div className={cn(
                    "absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                    colors.bg,
                    colors.text
                  )}>
                    {i + 1}
                  </div>
                </div>

                {/* Label */}
                <span className="text-xs font-medium text-foreground mt-3">{step.label}</span>
                
                {/* Action chip */}
                <div className="mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full",
                    colors.bg,
                    "text-muted-foreground"
                  )}>
                    {step.action}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
