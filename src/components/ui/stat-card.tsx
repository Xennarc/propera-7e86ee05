import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    value: 'text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    value: 'text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
    value: 'text-destructive',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {Icon && (
            <div className={cn('rounded-xl p-2.5 sm:p-3', styles.icon)}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-xl sm:text-2xl font-bold', styles.value)}>{value}</p>
            {description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                'text-[11px] sm:text-xs font-medium',
                trend.value >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
