import { motion } from 'framer-motion';
import { Settings, Smartphone, Users } from 'lucide-react';
import { memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { RibbonDivider } from './RibbonDivider';

const steps = [
  {
    icon: Settings,
    number: '1',
    title: 'Set up your resort',
    description: 'Add your experiences, dining, and branding.',
  },
  {
    icon: Smartphone,
    number: '2',
    title: 'Guests browse and book',
    description: 'Clean, mobile-first flows that reduce calls.',
  },
  {
    icon: Users,
    number: '3',
    title: 'Teams run the day',
    description: 'Clear schedules, rosters, and requests in one view.',
  },
];

const StepCard = memo(function StepCard({
  step,
  index,
  isLast,
  shouldAnimate,
}: {
  step: typeof steps[0];
  index: number;
  isLast: boolean;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      className="relative flex flex-col items-center text-center group"
    >
      {/* Number badge with gradient orb */}
      <div className="relative mb-6">
        <div className="icon-orb-gradient w-16 h-16 text-primary">
          <step.icon className="h-7 w-7" />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-400 text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30">
          {step.number}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">{step.description}</p>

      {/* Connector line with ribbon accent */}
      {!isLast && (
        <div className="hidden md:block absolute top-8 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px">
          <div className="w-full h-full bg-gradient-to-r from-primary/40 via-teal-400/30 to-primary/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
        </div>
      )}
    </motion.div>
  );
});

export function HowItWorks() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            From setup to service — smoothly.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
              shouldAnimate={shouldAnimate}
            />
          ))}
        </div>
      </div>
      
      <RibbonDivider className="absolute bottom-0 left-0 right-0" variant="subtle" />
    </section>
  );
}
