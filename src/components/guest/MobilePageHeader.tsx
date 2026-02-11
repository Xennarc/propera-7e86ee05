import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show back button (default: true) */
  showBack?: boolean;
  /** Custom back handler (default: navigate(-1)) */
  onBack?: () => void;
  /** Right-side actions (icon buttons, etc.) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent mobile page header for Guest Portal sub-pages.
 * Provides back navigation, title, optional subtitle, and right-side actions.
 */
export function MobilePageHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  actions,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("flex items-center gap-3 mb-5", className)}>
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack || (() => navigate(-1))}
          className="h-10 w-10 shrink-0 rounded-xl tap-target"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
