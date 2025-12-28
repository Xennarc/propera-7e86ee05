import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Plane, Home, Search, Calendar, Sparkles, LogOut } from 'lucide-react';

const journeySteps = [
  { icon: Plane, label: 'Pre-arrival', action: 'Completed preferences' },
  { icon: Home, label: 'Check-in', action: 'Room assigned' },
  { icon: Search, label: 'Browse', action: 'Viewing activities' },
  { icon: Calendar, label: 'Book', action: 'Booked spa session' },
  { icon: Sparkles, label: 'Enjoy', action: 'At the pool' },
  { icon: LogOut, label: 'Depart', action: 'Feedback submitted' },
];

export function GuestJourneyFlow() {
  const { ref, revealed } = useScrollReveal();

  return (
    <div className="relative py-8">
      {/* Connection line - static */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden md:block" />
      
      {/* Static center dot instead of traveling animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/40 hidden md:block" />

      <div
        ref={ref}
        className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
      >
        <div className="flex flex-wrap justify-center gap-4 md:gap-0 md:justify-between relative">
          {journeySteps.map((step, i) => (
            <div
              key={step.label}
              className={`flex flex-col items-center relative z-10 group stagger-${Math.min(i + 1, 7)}`}
            >
              {/* Icon circle with CSS hover */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10 transition-all duration-200 hover:border-primary/60 hover:shadow-primary/20 hover:scale-110 hover:-translate-y-1">
                  <step.icon className="h-5 w-5" />
                </div>
                
                {/* Step number */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-teal-400 text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {i + 1}
                </div>
              </div>

              {/* Label */}
              <span className="text-xs font-medium text-foreground mt-3">{step.label}</span>
              
              {/* Action chip */}
              <div className="mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  {step.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
