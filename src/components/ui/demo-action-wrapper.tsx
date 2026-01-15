import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DemoActionWrapperProps {
  children: ReactNode;
  isReadOnly: boolean;
  tooltipText?: string;
}

/**
 * Wrapper component that disables child elements in demo read-only mode
 * and shows a tooltip explaining why.
 */
export function DemoActionWrapper({ 
  children, 
  isReadOnly, 
  tooltipText = "This action is disabled in demo mode" 
}: DemoActionWrapperProps) {
  if (!isReadOnly) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed">
          <span className="pointer-events-none opacity-50">
            {children}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
