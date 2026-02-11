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
      "flex flex-col items-center justify-center py-14 px-6 text-center",
      "bg-gradient-to-b from-muted/20 via-transparent to-transparent rounded-2xl",
      className
    )}>
      <div className={cn(
        "flex h-[72px] w-[72px] items-center justify-center rounded-3xl mb-5",
        "bg-gradient-to-br from-muted/80 to-muted/40",
        "shadow-inner-subtle",
        iconClassName
      )}>
        <Icon className="h-9 w-9 text-muted-foreground/50" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {actionLabel && (actionHref || onAction) && (
          actionHref ? (
            <Link to={actionHref}>
              <Button className="min-w-[140px] h-11">{actionLabel}</Button>
            </Link>
          ) : (
            <Button onClick={onAction} className="min-w-[140px] h-11">{actionLabel}</Button>
          )
        )}
        
        {secondaryActionLabel && secondaryActionHref && (
          <Link to={secondaryActionHref}>
            <Button variant="outline" className="min-w-[140px] h-11">{secondaryActionLabel}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
