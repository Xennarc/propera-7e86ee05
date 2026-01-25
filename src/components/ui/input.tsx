import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - larger on mobile for better touch
          "flex w-full rounded-xl border border-input bg-background text-sm text-foreground",
          "h-12 px-4 py-3", // Larger for mobile touch (48px)
          "sm:h-11 sm:py-2.5", // Slightly smaller on desktop
          // Ring and transitions
          "ring-offset-background transition-all duration-150",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground/60",
          // Hover state
          "hover:border-border/80",
          // Focus state - calmer ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          // Dark mode
          "dark:bg-midnight-900 dark:border-midnight-700 dark:focus-visible:border-lime-400 dark:focus-visible:ring-lime-400/15",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
