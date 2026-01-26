import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MobilePageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle or metadata */
  subtitle?: string;
  /** Optional count badge (e.g., "12 items") */
  count?: number;
  /** Show back button */
  showBack?: boolean;
  /** Custom back navigation handler */
  onBack?: () => void;
  /** Right-side actions */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
  /** Sticky behavior (default: true) */
  sticky?: boolean;
}

/**
 * Compact sticky header for mobile staff pages.
 * Provides consistent page context with optional navigation and actions.
 */
export function MobilePageHeader({
  title,
  subtitle,
  count,
  showBack = false,
  onBack,
  actions,
  className,
  sticky = true,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "lg:hidden",
        "flex items-center justify-between gap-3",
        "px-3 py-3 min-h-[52px]",
        "bg-background/95 backdrop-blur-sm",
        "border-b border-border/30",
        sticky && "sticky top-14 z-10",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 -ml-2 h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground truncate">
              {title}
            </h1>
            {count !== undefined && (
              <Badge variant="secondary" className="shrink-0 text-2xs">
                {count}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

/**
 * Spacer to account for MobilePageHeader height when sticky
 */
export function MobilePageHeaderSpacer({ className }: { className?: string }) {
  return <div className={cn("h-[52px] lg:h-0", className)} />;
}
