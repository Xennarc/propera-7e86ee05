import { motion } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { LucideIcon } from 'lucide-react';

interface AnimatedFeatureIconProps {
  icon: LucideIcon;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'orb' | 'flat' | 'glow';
  delay?: number;
  className?: string;
}

export function AnimatedFeatureIcon({ 
  icon: Icon, 
  label,
  size = 'md',
  variant = 'orb',
  delay = 0,
  className = ''
}: AnimatedFeatureIconProps) {
  const { shouldAnimate } = useAnimationPreference();

  const sizeClasses = {
    sm: { container: 'w-10 h-10', icon: 'h-5 w-5' },
    md: { container: 'w-14 h-14', icon: 'h-6 w-6' },
    lg: { container: 'w-20 h-20', icon: 'h-8 w-8' },
  };

  const variantClasses = {
    orb: 'icon-orb-gradient',
    flat: 'bg-primary/10 rounded-xl',
    glow: 'bg-gradient-to-br from-primary/20 to-teal-400/20 rounded-2xl shadow-lg shadow-primary/20',
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={shouldAnimate ? { scale: 1.05, rotate: 2 } : undefined}
      className={`flex flex-col items-center gap-2 ${className}`}
    >
      <div className={`
        ${sizeClasses[size].container} 
        ${variantClasses[variant]} 
        flex items-center justify-center text-primary
        transition-all duration-200
      `}>
        <motion.div
          animate={shouldAnimate ? { 
            y: [0, -2, 0],
          } : undefined}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: delay * 2
          }}
        >
          <Icon className={sizeClasses[size].icon} />
        </motion.div>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      )}
    </motion.div>
  );
}
