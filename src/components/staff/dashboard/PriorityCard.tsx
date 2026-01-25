import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronRight, AlertCircle } from 'lucide-react';

interface PriorityCardProps {
  /** Card title */
  title: string;
  /** Main metric value */
  value: number | string;
  /** Supporting context text */
  subtitle?: string;
  /** Icon component */
  icon: LucideIcon;
  /** Link destination */
  href: string;
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  /** Alert badge text (shows warning indicator) */
  alert?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional className */
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground',
    hoverBorder: 'hover:border-border',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
    hoverBorder: 'hover:border-primary/30',
  },
  success: {
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    valueColor: 'text-success',
    hoverBorder: 'hover:border-success/30',
  },
  warning: {
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    valueColor: 'text-warning',
    hoverBorder: 'hover:border-warning/30',
  },
  destructive: {
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    valueColor: 'text-destructive',
    hoverBorder: 'hover:border-destructive/30',
  },
};

/**
 * Premium priority card for dashboard metrics.
 * Designed for mobile-first with generous touch targets and clear hierarchy.
 */
export function PriorityCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  variant = 'default',
  alert,
  loading = false,
  className,
}: PriorityCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className={cn("h-11 w-11 sm:h-12 sm:w-12 rounded-xl", styles.iconBg, "opacity-50")} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-7 w-16 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to={href} className="block group">
      <Card 
        className={cn(
          "transition-all duration-200 border-border/40",
          styles.hoverBorder,
          "hover:shadow-md hover:bg-muted/30 active:scale-[0.98]",
          className
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Icon Container */}
            <div className={cn(
              "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl shrink-0",
              styles.iconBg
            )}>
              <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", styles.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={cn("text-2xl sm:text-3xl font-bold", styles.valueColor)}>
                  {value}
                </span>
                
                {alert && (
                  <Badge 
                    variant="secondary" 
                    className="text-[11px] bg-warning/10 text-warning border-warning/20 flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {alert}
                  </Badge>
                )}
              </div>
              
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Chevron */}
            <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0 self-center" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface PriorityCardGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive grid for priority cards.
 * 1 column on mobile, 2 on tablet, 3-4 on desktop.
 */
export function PriorityCardGrid({ children, className }: PriorityCardGridProps) {
  return (
    <div className={cn(
      "grid gap-3 sm:gap-4",
      "grid-cols-1 xs:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
