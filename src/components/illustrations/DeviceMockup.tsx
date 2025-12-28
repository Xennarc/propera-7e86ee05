import { motion } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { ReactNode } from 'react';

interface DeviceMockupProps {
  type: 'phone' | 'desktop';
  children: ReactNode;
  className?: string;
  floating?: boolean;
}

export function DeviceMockup({ type, children, className = '', floating = false }: DeviceMockupProps) {
  const { shouldAnimate } = useAnimationPreference();

  if (type === 'phone') {
    return (
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`relative ${floating && shouldAnimate ? 'animate-gentle-float' : ''} ${className}`}
      >
        <div className="relative w-[200px] md:w-[240px] bg-card/90 backdrop-blur-xl rounded-[28px] border-2 border-border/50 shadow-2xl shadow-primary/10 overflow-hidden">
          {/* Phone notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-card rounded-b-2xl z-10 flex items-center justify-center">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
          
          {/* Screen content */}
          <div className="pt-8 pb-4 px-3">
            {children}
          </div>
          
          {/* Home indicator */}
          <div className="flex justify-center pb-2">
            <div className="w-24 h-1 bg-muted rounded-full" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative ${floating && shouldAnimate ? 'animate-gentle-float' : ''} ${className}`}
      style={floating ? { animationDelay: '0.5s' } : undefined}
    >
      <div className="relative bg-card/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Desktop top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-coral-400" />
            <div className="w-3 h-3 rounded-full bg-sunset-400" />
            <div className="w-3 h-3 rounded-full bg-success" />
          </div>
          <div className="flex-1 ml-3 h-5 bg-muted/50 rounded-md max-w-[180px]" />
        </div>
        
        {/* Screen content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
