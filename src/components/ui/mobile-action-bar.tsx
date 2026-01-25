import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show on all screen sizes (default: only mobile) */
  alwaysVisible?: boolean;
}

/**
 * Fixed bottom action bar for mobile forms and detail pages.
 * Automatically handles safe area insets and keyboard avoidance.
 */
const MobileActionBar = React.forwardRef<HTMLDivElement, MobileActionBarProps>(
  ({ className, alwaysVisible = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40",
          "p-4 flex items-center gap-3",
          "bg-card/95 dark:bg-midnight-900/95",
          "border-t border-border/40",
          "backdrop-blur-xl",
          // Safe area support
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          // Hide on desktop by default
          !alwaysVisible && "lg:hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MobileActionBar.displayName = "MobileActionBar";

/**
 * Spacer component to add bottom padding matching the action bar height.
 * Use this at the bottom of scrollable content to prevent overlap.
 */
const MobileActionBarSpacer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "h-24 lg:h-0", // ~96px for action bar + safe area
        className
      )}
      {...props}
    />
  );
});
MobileActionBarSpacer.displayName = "MobileActionBarSpacer";

export { MobileActionBar, MobileActionBarSpacer };
