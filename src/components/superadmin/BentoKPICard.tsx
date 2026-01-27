import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface BentoKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  size?: 'default' | 'large';
  trend?: {
    value: number;
    label?: string;
  };
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
}

/**
 * Micro Sparkline - A tiny 24-hour trend visualization
 */
function MicroSparkline({ data, variant }: { data: number[]; variant: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const variantColors = {
    default: 'stroke-muted-foreground/40',
    primary: 'stroke-primary/60',
    success: 'stroke-success/60',
    warning: 'stroke-warning/60',
    info: 'stroke-info/60',
  };

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none" 
      className="h-8 w-16 opacity-80"
    >
      <polyline
        points={points}
        fill="none"
        className={cn('transition-all duration-500', variantColors[variant as keyof typeof variantColors] || variantColors.default)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Bento KPI Card - Mission Control style metric card
 * Features glassmorphism, micro-sparklines, and trend indicators
 */
export function BentoKPICard({
  title,
  value,
  icon: Icon,
  loading = false,
  variant = 'default',
  size = 'default',
  trend,
  sparklineData,
  onClick,
  className,
}: BentoKPICardProps) {
  const variantStyles = {
    default: {
      bg: 'bg-card/60 hover:bg-card/80',
      border: 'border-border/30',
      icon: 'bg-muted/50 text-muted-foreground',
      glow: '',
    },
    primary: {
      bg: 'bg-primary/5 hover:bg-primary/10',
      border: 'border-primary/20',
      icon: 'bg-primary/10 text-primary',
      glow: 'shadow-[0_0_30px_-10px_hsl(var(--primary)/0.3)]',
    },
    success: {
      bg: 'bg-success/5 hover:bg-success/10',
      border: 'border-success/20',
      icon: 'bg-success/10 text-success',
      glow: 'shadow-[0_0_30px_-10px_hsl(var(--success)/0.3)]',
    },
    warning: {
      bg: 'bg-warning/5 hover:bg-warning/10',
      border: 'border-warning/20',
      icon: 'bg-warning/10 text-warning',
      glow: 'shadow-[0_0_30px_-10px_hsl(var(--warning)/0.3)]',
    },
    info: {
      bg: 'bg-info/5 hover:bg-info/10',
      border: 'border-info/20',
      icon: 'bg-info/10 text-info',
      glow: 'shadow-[0_0_30px_-10px_hsl(var(--info)/0.3)]',
    },
  };

  const styles = variantStyles[variant];

  const TrendIcon = trend?.value && trend.value > 0 
    ? TrendingUp 
    : trend?.value && trend.value < 0 
      ? TrendingDown 
      : Minus;

  const trendColor = trend?.value && trend.value > 0
    ? 'text-success'
    : trend?.value && trend.value < 0
      ? 'text-destructive'
      : 'text-muted-foreground';

  return (
    <div
      onClick={onClick}
      className={cn(
        // Base styles
        'group relative overflow-hidden rounded-2xl border backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        // Variant styles
        styles.bg,
        styles.border,
        styles.glow,
        // Interactive states
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
        // Size variants
        size === 'large' && 'col-span-2',
        className
      )}
    >
      {/* Subtle animated gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.05), transparent 70%)',
        }}
      />

      <div className={cn(
        'relative p-4',
        size === 'large' && 'p-5'
      )}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: Title + Value */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'font-medium text-muted-foreground uppercase tracking-[0.1em] mb-1.5',
              size === 'large' ? 'text-[11px]' : 'text-[10px]'
            )}>
              {title}
            </p>
            
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className={cn(
                  'font-bold tracking-tight',
                  size === 'large' ? 'text-3xl' : 'text-2xl'
                )}>
                  {value}
                </p>
                
                {/* Trend indicator */}
                {trend && (
                  <div className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    trendColor
                  )}>
                    <TrendIcon className="h-3 w-3" />
                    <span>{Math.abs(trend.value)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Trend label */}
            {trend?.label && (
              <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                {trend.label}
              </p>
            )}
          </div>

          {/* Right: Icon + Sparkline */}
          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              'p-2.5 rounded-xl',
              styles.icon
            )}>
              <Icon className={cn(
                'transition-transform duration-300 group-hover:scale-110',
                size === 'large' ? 'h-5 w-5' : 'h-4 w-4'
              )} />
            </div>
            
            {/* Micro sparkline */}
            {sparklineData && sparklineData.length > 0 && (
              <MicroSparkline data={sparklineData} variant={variant} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
