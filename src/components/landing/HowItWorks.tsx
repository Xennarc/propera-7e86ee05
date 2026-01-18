import { Settings, Smartphone, Users, Play, Waves, Sun, Sparkles } from 'lucide-react';
import { memo } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';

import { DeviceMockup } from '@/components/illustrations/DeviceMockup';

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

// Mobile phone preview content matching guest portal
const mobilePreviewItems = [
  { name: 'Snorkel Safari', icon: Waves, color: 'lagoon' },
  { name: 'Sunset Cruise', icon: Sun, color: 'sunset' },
  { name: 'Spa Session', icon: Sparkles, color: 'orchid' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  lagoon: { bg: 'bg-lagoon/10', text: 'text-lagoon' },
  sunset: { bg: 'bg-sunset/10', text: 'text-sunset' },
  orchid: { bg: 'bg-orchid/10', text: 'text-orchid' },
};

const StepCard = memo(function StepCard({
  step,
  index,
  isLast,
}: {
  step: typeof steps[0];
  index: number;
  isLast: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center text-center group stagger-${index + 2}`}
    >
      {/* Number badge with gradient orb */}
      <div className="relative mb-4 md:mb-6">
        <div className="icon-orb-gradient icon-orb-hover w-14 h-14 md:w-16 md:h-16 text-primary cursor-pointer">
          <step.icon className="h-6 w-6 md:h-7 md:w-7" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-primary to-teal-400 text-primary-foreground flex items-center justify-center text-xs md:text-sm font-bold shadow-lg shadow-primary/30">
          {step.number}
        </div>
      </div>

      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{step.title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4">{step.description}</p>

      {/* Mini preview on hover - CSS only */}
      <div className="preview-reveal">
        <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border/40 p-3 space-y-1.5">
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

      {/* Connector line - static */}
      {!isLast && (
        <div className="hidden md:block absolute top-8 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px">
          <div className="w-full h-full bg-gradient-to-r from-primary/40 via-teal-400/30 to-primary/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
        </div>
      )}
    </div>
  );
});

// Mini phone mockup for mobile - matches guest portal
function MiniPhoneMockup() {
  return (
    <div className="mx-auto w-[140px] bg-card/95 backdrop-blur-xl rounded-[20px] border-2 border-border/50 shadow-lg overflow-hidden">
      {/* Notch */}
      <div className="flex justify-center pt-1.5">
        <div className="w-10 h-3 bg-background rounded-full" />
      </div>
      
      {/* Screen content */}
      <div className="px-2 py-2 space-y-1.5">
        <p className="text-[8px] font-semibold text-foreground px-1">My Bookings</p>
        {mobilePreviewItems.map((item) => {
          const colors = colorMap[item.color];
          const Icon = item.icon;
          return (
            <div key={item.name} className="flex items-center gap-1.5 p-1.5 bg-card/80 rounded-lg border border-border/30">
              <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", colors.bg)}>
                <Icon className={cn("h-2.5 w-2.5", colors.text)} />
              </div>
              <span className="text-[8px] font-medium text-foreground truncate">{item.name}</span>
            </div>
          );
        })}
      </div>
      
      {/* Home indicator */}
      <div className="flex justify-center pb-1.5">
        <div className="w-10 h-0.5 bg-muted-foreground/30 rounded-full" />
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { ref, revealed } = useScrollReveal();

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 max-w-4xl mx-auto mb-10 md:mb-16">
            {steps.map((step, index) => (
              <StepCard
                key={step.title}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>

          {/* Mobile: Mini phone preview */}
          <div className="md:hidden flex justify-center mb-8">
            <MiniPhoneMockup />
          </div>

          {/* Device mockup showcase - desktop only */}
          <div className="hidden md:flex justify-center items-end gap-6 max-w-3xl mx-auto stagger-5">
            <DeviceMockup type="phone" floating className="hidden lg:block">
              <div className="space-y-2">
                <div className="text-[10px] font-medium text-muted-foreground mb-2">Guest Portal</div>
                {mobilePreviewItems.map((item, i) => {
                  const colors = colorMap[item.color];
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className={`flex items-center gap-2 p-2 bg-background/60 rounded-lg border border-border/20 text-[10px] stagger-${i + 1}`}
                    >
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", colors.bg)}>
                        <Icon className={cn("h-3 w-3", colors.text)} />
                      </div>
                      <span className="text-foreground">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </DeviceMockup>
            
            <DeviceMockup type="desktop" className="flex-1 max-w-md">
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
      
    </section>
  );
}

export default HowItWorks;
