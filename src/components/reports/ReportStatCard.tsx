import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ReportStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ReportStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}: ReportStatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600 dark:text-green-400';
    if (trend.value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20';
      case 'warning':
        return 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20';
      case 'danger':
        return 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20';
      default:
        return '';
    }
  };

  const getIconContainerStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/50';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/50';
      case 'danger':
        return 'bg-red-100 dark:bg-red-900/50';
      default:
        return 'bg-primary/10';
    }
  };

  return (
    <Card className={cn("transition-all hover:shadow-md", getVariantStyles(), className)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", getIconContainerStyles())}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <div className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor())}>
                  {getTrendIcon()}
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {trend?.label && (
              <p className="text-xs text-muted-foreground mt-0.5">{trend.label}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
