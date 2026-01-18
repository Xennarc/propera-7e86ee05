import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingUIChipProps {
  icon?: LucideIcon;
  text: string;
  subtext?: string;
  variant?: 'default' | 'success' | 'primary' | 'lagoon' | 'sunset' | 'orchid' | 'coral';
  delay?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function FloatingUIChip({ 
  icon: Icon, 
  text, 
  subtext,
  variant = 'default',
  delay = 0,
  size = 'md',
  className = ''
}: FloatingUIChipProps) {
  const variantStyles = {
    default: 'bg-card/90 border-border/40',
    success: 'bg-success/10 border-success/30',
    primary: 'bg-primary/10 border-primary/30',
    lagoon: 'bg-lagoon/10 border-lagoon/30',
    sunset: 'bg-sunset/10 border-sunset/30',
    orchid: 'bg-orchid/10 border-orchid/30',
    coral: 'bg-coral/10 border-coral/30',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-success',
    primary: 'text-primary',
    lagoon: 'text-lagoon',
    sunset: 'text-sunset',
    orchid: 'text-orchid',
    coral: 'text-coral',
  };

  const sizeStyles = {
    sm: 'px-2 py-1.5 gap-1.5',
    md: 'px-3 py-2 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
  };

  return (
    <div
      className={cn('floating-chip-static', className)}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={cn(
        'flex items-center rounded-xl backdrop-blur-md border shadow-lg',
        variantStyles[variant],
        sizeStyles[size]
      )}>
        {Icon && (
          <Icon className={cn(iconSizes[size], iconColors[variant])} />
        )}
        <div className="flex flex-col">
          <span className={cn('font-medium text-foreground', textSizes[size])}>{text}</span>
          {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
        </div>
        {variant === 'success' && (
          <span className="w-2 h-2 rounded-full bg-success ml-1" />
        )}
      </div>
    </div>
  );
}
