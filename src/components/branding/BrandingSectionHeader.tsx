import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BrandingSectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}

export function BrandingSectionHeader({
  icon: Icon,
  title,
  description,
  onReset,
  resetLabel = 'Reset',
  className,
}: BrandingSectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-4', className)}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      
      {onReset && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {resetLabel}
        </Button>
      )}
    </div>
  );
}
