import { motion } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { LucideIcon } from 'lucide-react';

interface FloatingUIChipProps {
  icon?: LucideIcon;
  text: string;
  subtext?: string;
  variant?: 'default' | 'success' | 'primary';
  delay?: number;
  className?: string;
}

export function FloatingUIChip({ 
  icon: Icon, 
  text, 
  subtext,
  variant = 'default',
  delay = 0,
  className = ''
}: FloatingUIChipProps) {
  const { shouldAnimate } = useAnimationPreference();

  const variantStyles = {
    default: 'bg-card/90 border-border/40',
    success: 'bg-success/10 border-success/30',
    primary: 'bg-primary/10 border-primary/30',
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.9, y: 10 } : { opacity: 1, scale: 1, y: 0 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className={`floating-chip-gpu ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border shadow-lg
        ${variantStyles[variant]}
      `}>
        {Icon && (
          <Icon className={`h-4 w-4 ${variant === 'success' ? 'text-success' : variant === 'primary' ? 'text-primary' : 'text-muted-foreground'}`} />
        )}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">{text}</span>
          {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
        </div>
        {variant === 'success' && (
          <span className="w-2 h-2 rounded-full bg-success ml-1" />
        )}
      </div>
    </motion.div>
  );
}
