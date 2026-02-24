import { Settings, Smartphone, Users, Play, Waves, Sun, Sparkles, CheckCircle2, Clock, Circle } from 'lucide-react';
import { memo } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { useLandingTheme } from '@/lib/landingTheme';

import { DeviceMockup } from '@/components/illustrations/DeviceMockup';
import { StaffTasksShowcase } from '@/components/illustrations/StaffTasksShowcase';

const steps = [
  {
    icon: Settings,
    number: '1',
    title: 'Set up your resort',
    description: 'Add your experiences, dining, and branding.',
    preview: {
      type: 'setup',
      items: ['Activities', 'Restaurants', 'Branding', 'Staff'],
    },
  },
  {
    icon: Smartphone,
    number: '2',
    title: 'Guests browse and book',
    description: 'Clean, mobile-first flows that reduce calls.',
    preview: {
      type: 'guest',
      items: ['Browse activities', 'Book instantly', 'View itinerary'],
    },
  },
  {
    icon: Users,
    number: '3',
    title: 'Teams run the day',
    description: 'Clear schedules, rosters, and requests in one view.',
    preview: {
      type: 'staff',
      items: ['Today: 12 bookings', 'VIP arriving', '3 requests'],
    },
  },
];

const StepCard = memo(function StepCard({
  step,
  index,
  isLast,
  skeuo,
}: {
  step: typeof steps[0];
  index: number;
  isLast: boolean;
  skeuo: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center text-center group stagger-${index + 2}`}
    >
      {/* Number badge */}
      <div className="relative mb-4 md:mb-6">
        <div className={cn(
          "w-14 h-14 md:w-16 md:h-16 cursor-pointer",
          skeuo
            ? "skeuo-icon-badge flex items-center justify-center text-[hsl(var(--skeuo-accent-muted))]"
            : "icon-orb-gradient icon-orb-hover text-primary"
        )}>
          <step.icon className="h-6 w-6 md:h-7 md:w-7" />
        </div>
        {/* Enamel number badge */}
        <div className={cn(
          "absolute -top-2 -right-2 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs md:text-sm font-bold",
          skeuo
            ? "skeuo-enamel-badge"
            : "bg-gradient-to-br from-primary to-teal-400 text-primary-foreground shadow-lg shadow-primary/30"
        )}>
          {step.number}
        </div>
      </div>

      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{step.title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4">{step.description}</p>

      {/* Mini preview on hover */}
      <div className="preview-reveal">
        <div className={cn(
          "rounded-lg border p-3 space-y-1.5",
          skeuo
            ? "skeuo-inset"
            : "bg-card/80 backdrop-blur-sm border-border/40"
        )}>
          {step.preview.items.map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-2 text-xs text-muted-foreground preview-item-${i + 1}`}
            >
              <Play className="h-2.5 w-2.5 text-primary fill-primary" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="hidden md:block absolute top-8 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px">
          {skeuo ? (
            /* Inlaid groove: shadow line + highlight line */
            <>
              <div className="w-full h-px bg-[var(--skeuo-edge-shadow)]" />
              <div className="w-full h-px bg-[var(--skeuo-edge-highlight)] opacity-60" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[hsl(var(--skeuo-surface-2))] border border-[var(--skeuo-edge-highlight)] shadow-[inset_1px_1px_2px_0_var(--skeuo-edge-shadow)]" />
            </>
          ) : (
            <>
              <div className="w-full h-full bg-gradient-to-r from-primary/40 via-teal-400/30 to-primary/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
            </>
          )}
        </div>
      )}
    </div>
  );
});

export function HowItWorks() {
  const { ref, revealed } = useScrollReveal();
  const theme = useLandingTheme();
  const skeuo = theme === 'skeuo';

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4">
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="text-center mb-10 md:mb-16 stagger-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              From setup to service — smoothly.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto px-4">
              <span className="hidden md:inline">Hover over each step to see what happens</span>
              <span className="md:hidden">Tap each step to learn more</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <StepCard
                key={step.title}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
                skeuo={skeuo}
              />
            ))}
          </div>

          {/* Device mockup showcase */}
          <div className={cn(
            "mt-12 md:mt-16 pt-8",
            skeuo ? "skeuo-divider" : "border-t border-border/20"
          )}>
            {/* Mobile: Staff Tasks phone preview */}
            <div className="md:hidden flex justify-center mt-8">
              <div className={cn(skeuo && "skeuo-inset skeuo-noise p-3 rounded-[20px]")}>
                <StaffTasksShowcase />
              </div>
            </div>

            {/* Desktop: Staff Tasks Phone + Dashboard side by side */}
            <div className="hidden md:flex justify-center items-end gap-8 max-w-3xl mx-auto stagger-5 mt-8">
              {/* Staff Tasks Phone */}
              <div className={cn(skeuo && "skeuo-inset skeuo-noise p-3 rounded-[20px]")}>
                <StaffTasksShowcase className="hidden lg:block" />
              </div>
              
              {/* Desktop Dashboard */}
              <div className={cn(skeuo && "skeuo-inset skeuo-noise p-3 rounded-[20px] flex-1 max-w-md")}>
                <DeviceMockup type="desktop" className={cn(!skeuo && "flex-1 max-w-md")}>
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground mb-3">Staff Dashboard</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Bookings', value: '24' },
                        { label: 'Guests', value: '86' },
                        { label: 'Requests', value: '5' },
                      ].map((stat, i) => (
                        <div
                          key={stat.label}
                          className={`bg-background/60 rounded-lg p-2 text-center border border-border/20 stagger-${i + 1}`}
                        >
                          <p className="text-lg font-bold text-foreground">{stat.value}</p>
                          <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="h-12 bg-gradient-to-r from-primary/10 to-teal-400/10 rounded-lg flex items-end px-2 pb-1 gap-1">
                      {[30, 45, 35, 60, 50, 70, 55].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/60 rounded-t-sm chart-bar-grow"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </DeviceMockup>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </section>
  );
}

export default HowItWorks;
