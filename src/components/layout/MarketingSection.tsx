import { cn } from '@/lib/utils';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

interface MarketingSectionProps {
  id?: string;
  className?: string;
  tone?: 'default' | 'lifted' | 'spotlight';
  size?: 'default' | 'narrow' | 'wide' | 'full';
  children: React.ReactNode;
  noPadding?: boolean;
}

const sizeClasses = {
  default: 'max-w-6xl',
  narrow: 'max-w-4xl',
  wide: 'max-w-7xl',
  full: 'max-w-none',
};

export function MarketingSection({ 
  id, 
  className, 
  tone = 'default', 
  size = 'default',
  noPadding = false,
  children 
}: MarketingSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative scroll-mt-24',
        !noPadding && 'py-20 md:py-28',
        className
      )}
    >
      {tone === 'spotlight' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
      )}
      
      <ScrollReveal className={cn(
        'mx-auto px-6 relative',
        sizeClasses[size],
        tone === 'lifted' && 'marketing-lifted-surface'
      )}>
        {children}
      </ScrollReveal>
    </section>
  );
}
