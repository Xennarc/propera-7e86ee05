import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface GuestEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  iconClassName?: string;
  className?: string;
}

export function GuestEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  iconClassName,
  className,
}: GuestEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4",
        iconClassName
      )}>
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-2">
        {actionLabel && (actionHref || onAction) && (
          actionHref ? (
            <Link to={actionHref}>
              <Button className="min-w-[140px]">{actionLabel}</Button>
            </Link>
          ) : (
            <Button onClick={onAction} className="min-w-[140px]">{actionLabel}</Button>
          )
        )}
        
        {secondaryActionLabel && secondaryActionHref && (
          <Link to={secondaryActionHref}>
            <Button variant="outline" className="min-w-[140px]">{secondaryActionLabel}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
