import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestSectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function GuestSectionHeader({
  title,
  icon,
  actionLabel,
  actionHref,
  onAction,
  className,
}: GuestSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link 
            to={actionHref}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
}
