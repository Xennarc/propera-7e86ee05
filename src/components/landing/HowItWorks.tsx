import { Settings, Smartphone, Users } from 'lucide-react';
import { memo } from 'react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const steps = [
  {
    icon: Settings,
    number: '1',
    title: 'Set up your resort',
    description: "Add your experiences, dining, and branding. Propera adapts to your property's identity.",
  },
  {
    icon: Smartphone,
    number: '2',
    title: 'Guests browse and book',
    description: 'Clean, mobile-first flows that reduce front desk calls and improve satisfaction.',
  },
  {
    icon: Users,
    number: '3',
    title: 'Teams run the day',
    description: 'Clear schedules, rosters, and requests in one view. Every department aligned.',
  },
];

const StepItem = memo(function StepItem({
  step,
  isLast,
}: {
  step: typeof steps[0];
  isLast: boolean;
}) {
  return (
    <RevealItem>
      <div className="grid grid-cols-[48px_1fr] gap-4 mb-9 last:mb-0 items-start">
        {/* Number + line */}
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {step.number}
          </div>
          {!isLast && (
            <div className="w-px flex-1 min-h-[40px] bg-gradient-to-b from-primary/30 to-transparent mt-1.5" />
          )}
        </div>

        {/* Content */}
        <div>
          <div className="w-[42px] h-[42px] bg-card rounded-[13px] flex items-center justify-center mb-3">
            <step.icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-[17px] font-semibold text-foreground mb-1.5 tracking-[-0.3px]">{step.title}</h3>
          <p className="text-sm font-light leading-[1.65] text-muted-foreground">{step.description}</p>
        </div>
      </div>
    </RevealItem>
  );
});

export function HowItWorks() {
  return (
    <section className="py-[60px] relative overflow-hidden bg-card/30 border-t border-b border-border/50">
      <div className="container relative mx-auto px-4">
        <ScrollReveal>
          <RevealItem className="mb-8">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Setup</p>
            <h2 className="font-serif text-[38px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3.5">
              From setup to service — smoothly.
            </h2>
          </RevealItem>

          <div className="max-w-lg">
            {steps.map((step, index) => (
              <StepItem
                key={step.title}
                step={step}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default HowItWorks;
