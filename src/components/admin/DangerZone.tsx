import * as React from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

interface DangerZoneProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Default collapsed on mobile for safety */
  defaultCollapsed?: boolean;
  className?: string;
}

export function DangerZone({
  title = 'Danger Zone',
  description,
  children,
  defaultCollapsed,
  className,
}: DangerZoneProps) {
  const isMobile = useIsMobile();
  // Default to collapsed on mobile for safety
  const [isOpen, setIsOpen] = React.useState(
    defaultCollapsed !== undefined ? !defaultCollapsed : !isMobile
  );

  // Update when mobile state changes
  React.useEffect(() => {
    if (defaultCollapsed === undefined) {
      setIsOpen(!isMobile);
    }
  }, [isMobile, defaultCollapsed]);

  return (
    <div 
      className={cn(
        "border-l-4 border-destructive/50 bg-destructive/5 rounded-r-lg",
        "dark:bg-destructive/10",
        className
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left p-4 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-destructive">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-destructive/70 transition-transform duration-200 shrink-0",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 space-y-3">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
