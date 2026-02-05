import * as React from "react";
import { cn } from "@/lib/utils";

interface DriverMobileActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Fixed bottom action bar for driver trip actions.
 * Handles safe area insets on mobile devices.
 */
export function DriverMobileActionBar({ 
  className, 
  children, 
  ...props 
}: DriverMobileActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "p-4 flex items-center gap-3",
        "bg-background/95 backdrop-blur-xl",
        "border-t border-border/50",
        // Safe area support
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Spacer component to prevent content from being hidden behind the action bar.
 */
export function DriverMobileActionBarSpacer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-28", // ~112px for action bar + safe area
        className
      )}
    />
  );
}
