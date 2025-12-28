import { motion } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { Plane, Home, Search, Calendar, Sparkles, LogOut } from 'lucide-react';
import { FloatingUIChip } from './FloatingUIChip';

const journeySteps = [
  { icon: Plane, label: 'Pre-arrival', action: 'Completed preferences' },
  { icon: Home, label: 'Check-in', action: 'Room assigned' },
  { icon: Search, label: 'Browse', action: 'Viewing activities' },
  { icon: Calendar, label: 'Book', action: 'Booked spa session' },
  { icon: Sparkles, label: 'Enjoy', action: 'At the pool' },
  { icon: LogOut, label: 'Depart', action: 'Feedback submitted' },
];

export function GuestJourneyFlow() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <div className="relative py-8">
      {/* Connection line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden md:block" />
      
      {/* Animated dot traveling along the line */}
      {shouldAnimate && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50 hidden md:block"
          animate={{
            left: ['0%', '100%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      <div className="flex flex-wrap justify-center gap-4 md:gap-0 md:justify-between relative">
        {journeySteps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center relative z-10"
          >
            {/* Icon circle */}
            <motion.div
              whileHover={shouldAnimate ? { scale: 1.1, y: -4 } : undefined}
              className="relative"
            >
              <div className="w-12 h-12 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10 transition-all hover:border-primary/60 hover:shadow-primary/20">
                <step.icon className="h-5 w-5" />
              </div>
              
              {/* Step number */}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-teal-400 text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {i + 1}
              </div>
            </motion.div>

            {/* Label */}
            <span className="text-xs font-medium text-foreground mt-3">{step.label}</span>
            
            {/* Action chip (shown on hover or staggered) */}
            <motion.div
              initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : { opacity: 0.7, scale: 1 }}
              whileInView={{ opacity: 0.7, scale: 1 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="mt-2"
            >
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                {step.action}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Floating decorative chips */}
      <FloatingUIChip
        text="Seamless experience"
        variant="primary"
        delay={1}
        className="absolute -top-4 left-1/4 hidden lg:block"
      />
      <FloatingUIChip
        text="Real-time updates"
        variant="success"
        delay={1.5}
        className="absolute -bottom-4 right-1/4 hidden lg:block"
      />
    </div>
  );
}
