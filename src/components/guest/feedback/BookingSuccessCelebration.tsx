import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { Check } from 'lucide-react';

interface BookingSuccessCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

// Minimal confetti particle for subtle celebration
function ConfettiParticle({ 
  delay, 
  x, 
  color 
}: { 
  delay: number; 
  x: number; 
  color: string;
}) {
  return (
    <motion.div
      initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
      animate={{ 
        y: [0, -60, -40],
        x: [0, x, x * 1.2],
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.8],
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="absolute"
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
  );
}

// Animated checkmark with draw effect
function AnimatedCheckmark({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: reduced ? 'tween' : 'spring',
        stiffness: 200,
        damping: 15,
        duration: reduced ? 0.15 : undefined,
      }}
      className="relative flex items-center justify-center"
    >
      {/* Glow ring */}
      {!reduced && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.4, opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="absolute inset-0 rounded-full bg-primary/20"
          style={{ width: 80, height: 80, marginLeft: -8, marginTop: -8 }}
        />
      )}
      
      {/* Main circle */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.05,
        }}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30"
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ 
            duration: reduced ? 0.1 : 0.4, 
            delay: reduced ? 0 : 0.15,
            ease: 'easeOut',
          }}
        >
          <Check className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function BookingSuccessCelebration({ 
  isVisible, 
  onComplete 
}: BookingSuccessCelebrationProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti after checkmark appears
  useEffect(() => {
    if (isVisible && !prefersReducedMotion) {
      const timer = setTimeout(() => setShowConfetti(true), 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, prefersReducedMotion]);

  // Auto-dismiss
  useEffect(() => {
    if (isVisible) {
      const dismissTimer = setTimeout(() => {
        onComplete?.();
      }, prefersReducedMotion ? 600 : 1200);
      return () => clearTimeout(dismissTimer);
    }
    return undefined;
  }, [isVisible, onComplete, prefersReducedMotion]);

  // Subtle confetti colors (brand-aligned)
  const confettiColors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(142, 76%, 50%)', // Success green
    'hsl(var(--primary) / 0.7)',
  ];

  // Generate confetti particles (low count for subtlety)
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 100,
    delay: Math.random() * 0.15,
    color: confettiColors[i % confettiColors.length],
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          aria-live="polite"
          aria-label="Booking confirmed"
        >
          {/* Subtle backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-background/40 backdrop-blur-[2px]"
          />

          {/* Celebration content */}
          <div className="relative flex flex-col items-center">
            {/* Animated checkmark */}
            <AnimatedCheckmark reduced={prefersReducedMotion} />

            {/* Confetti particles (only if motion allowed) */}
            {showConfetti && !prefersReducedMotion && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2">
                {particles.map((p) => (
                  <ConfettiParticle
                    key={p.id}
                    delay={p.delay}
                    x={p.x}
                    color={p.color}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
