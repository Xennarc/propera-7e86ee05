import { AlignVerticalSpaceAround } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStaffMobileDensity } from '@/hooks/useStaffMobileDensity';
import { useToast } from '@/hooks/use-toast';

interface CompactModeToggleProps {
  className?: string;
  /** Show label next to icon */
  showLabel?: boolean;
}

/**
 * Mobile-only toggle for compact/dense view mode.
 * Renders nothing on desktop.
 */
export function CompactModeToggle({ className, showLabel = false }: CompactModeToggleProps) {
  const { isCompact, toggleCompact, isMobile } = useStaffMobileDensity();
  const { toast } = useToast();

  // Only render on mobile
  if (!isMobile) return null;

  const handleToggle = () => {
    toggleCompact();
    toast({
      description: isCompact ? 'Standard view' : 'Compact view',
      duration: 1500,
    });
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'sm' : 'icon'}
      onClick={handleToggle}
      className={cn(
        'text-muted-foreground hover:text-foreground transition-colors',
        isCompact && 'text-primary hover:text-primary/80',
        className
      )}
      aria-label={isCompact ? 'Switch to standard view' : 'Switch to compact view'}
      aria-pressed={isCompact}
    >
      <AlignVerticalSpaceAround className={cn('h-5 w-5', showLabel && 'mr-1.5 h-4 w-4')} />
      {showLabel && <span className="text-xs">{isCompact ? 'Compact' : 'Standard'}</span>}
    </Button>
  );
}
