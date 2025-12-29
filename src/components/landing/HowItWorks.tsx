import { Settings, Smartphone, Users, Play } from 'lucide-react';
import { memo } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { RibbonDivider } from './RibbonDivider';
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
      <div className="relative mb-6">
        <div className="icon-orb-gradient icon-orb-hover w-16 h-16 text-primary cursor-pointer">
          <step.icon className="h-7 w-7" />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-400 text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30">
          {step.number}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
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

export function HowItWorks() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="py-24 bg-gradient-to-b from-card via-card to-primary/5 dark:from-card dark:via-card dark:to-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 dark:via-primary/5 to-transparent" />
      {/* Enhanced glows for light mode */}
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="text-center mb-16 stagger-1">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              From setup to service — smoothly.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hover over each step to see what happens
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8 max-w-4xl mx-auto mb-16">
            {steps.map((step, index) => (
              <StepCard
                key={step.title}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>

          {/* Device mockup showcase */}
          <div className="flex justify-center items-end gap-6 max-w-3xl mx-auto stagger-5">
            <DeviceMockup type="phone" floating className="hidden md:block">
              <div className="space-y-2">
                <div className="text-[10px] font-medium text-muted-foreground mb-2">Guest Portal</div>
                {['Snorkel Safari', 'Sunset Cruise', 'Spa Session'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 p-2 bg-background/60 rounded-lg border border-border/20 text-[10px] stagger-${i + 1}`}
                  >
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-[8px]">🏄</span>
                    </div>
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
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
      
      <RibbonDivider className="absolute bottom-0 left-0 right-0" variant="subtle" />
    </section>
  );
}

export default HowItWorks;
