import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

interface ScrollRevealProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView' | 'viewport'> {
  children: React.ReactNode;
  className?: string;
  /** Override stagger timing (seconds) */
  stagger?: number;
  /** Viewport margin for trigger */
  margin?: string;
}

export function ScrollReveal({
  children,
  className,
  stagger = 0.08,
  margin = '-50px',
  style,
  ...rest
}: ScrollRevealProps) {
  const { shouldAnimate } = useAnimationPreference();

  if (!shouldAnimate) {
    return (
      <div className={className} style={style} {...(rest as any)}>
        {children}
      </div>
    );
  }

  const variants: Variants = stagger === 0.08
    ? containerVariants
    : {
        ...containerVariants,
        visible: {
          ...containerVariants.visible,
          transition: {
            ...(containerVariants.visible as any).transition,
            staggerChildren: stagger,
          },
        },
      };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      className={className}
      style={{ willChange: 'opacity, transform', ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface RevealItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: React.ReactNode;
  className?: string;
}

export function RevealItem({ children, className, style, ...rest }: RevealItemProps) {
  const { shouldAnimate } = useAnimationPreference();

  if (!shouldAnimate) {
    return (
      <div className={className} style={style} {...(rest as any)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={itemVariants}
      className={className}
      style={{ willChange: 'opacity, transform', ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
