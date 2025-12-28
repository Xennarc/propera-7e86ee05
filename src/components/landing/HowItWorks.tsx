import { motion } from 'framer-motion';
import { Settings, Smartphone, Users, Play } from 'lucide-react';
import { memo, useState } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
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
  shouldAnimate,
  isHovered,
  onHover,
}: {
  step: typeof steps[0];
  index: number;
  isLast: boolean;
  shouldAnimate: boolean;
  isHovered: boolean;
  onHover: (index: number | null) => void;
}) {
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      className="relative flex flex-col items-center text-center group"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Number badge with gradient orb */}
      <div className="relative mb-6">
        <motion.div 
          className="icon-orb-gradient w-16 h-16 text-primary cursor-pointer"
          whileHover={shouldAnimate ? { scale: 1.1 } : undefined}
          animate={isHovered && shouldAnimate ? { scale: 1.05 } : { scale: 1 }}
        >
          <step.icon className="h-7 w-7" />
        </motion.div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-400 text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30">
          {step.number}
        </div>
        
        {/* Removed infinite pulse ring - only show subtle scale on hover */}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-4">{step.description}</p>

      {/* Mini preview on hover */}
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ 
          opacity: isHovered ? 1 : 0, 
          y: isHovered ? 0 : 10,
          height: isHovered ? 'auto' : 0
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border/40 p-3 space-y-1.5">
          {step.preview.items.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Play className="h-2.5 w-2.5 text-primary fill-primary" />
              {item}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Connector line - static, no traveling dot */}
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
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/2 dark:via-primary/5 to-transparent" />

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
          <p className="text-muted-foreground max-w-xl mx-auto">
            Hover over each step to see what happens
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8 max-w-4xl mx-auto mb-16">
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
              shouldAnimate={shouldAnimate}
              isHovered={hoveredStep === index}
              onHover={setHoveredStep}
            />
          ))}
        </div>

        {/* Device mockup showcase */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex justify-center items-end gap-6 max-w-3xl mx-auto"
        >
          <DeviceMockup type="phone" floating className="hidden md:block">
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-2">Guest Portal</div>
              {['Snorkel Safari', 'Sunset Cruise', 'Spa Session'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2 p-2 bg-background/60 rounded-lg border border-border/20 text-[10px]"
                >
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-[8px]">🏄</span>
                  </div>
                  <span className="text-foreground">{item}</span>
                </motion.div>
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
                  <motion.div
                    key={stat.label}
                    initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="bg-background/60 rounded-lg p-2 text-center border border-border/20"
                  >
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
              <div className="h-12 bg-gradient-to-r from-primary/10 to-teal-400/10 rounded-lg flex items-end px-2 pb-1 gap-1">
                {[30, 45, 35, 60, 50, 70, 55].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={shouldAnimate ? { height: 0 } : { height: `${h}%` }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.05 }}
                    className="flex-1 bg-primary/60 rounded-t-sm"
                  />
                ))}
              </div>
            </div>
          </DeviceMockup>
        </motion.div>
      </div>
      
      <RibbonDivider className="absolute bottom-0 left-0 right-0" variant="subtle" />
    </section>
  );
}
