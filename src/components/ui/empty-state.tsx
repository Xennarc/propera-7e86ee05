import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type EmptyStateVariant = 'default' | 'warning' | 'info';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const variantStyles = {
    default: {
      container: '',
      iconBg: 'bg-muted/50',
      iconColor: 'text-muted-foreground/50',
    },
    warning: {
      container: 'bg-warning/5 border border-warning/20 rounded-xl',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    info: {
      container: 'bg-primary/5 border border-primary/20 rounded-xl',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      styles.container,
      className
    )}>
      <div className={cn("rounded-full p-4 mb-4", styles.iconBg)}>
        <Icon className={cn("h-10 w-10", styles.iconColor)} />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
