import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm glow-lime",
        secondary: "border-transparent bg-secondary text-secondary-foreground dark:bg-midnight-800",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: "text-foreground border-border/40 dark:border-midnight-600",
        // Status variants
        confirmed: "border-transparent bg-success/15 text-success",
        pending: "border-transparent bg-warning/15 text-warning",
        cancelled: "border-transparent bg-destructive/15 text-destructive",
        completed: "border-transparent bg-primary/15 text-primary",
        noShow: "border-transparent bg-muted text-muted-foreground dark:bg-midnight-800",
        // Utility variants
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        info: "border-transparent bg-info/15 text-info",
        // Subtle variants for tags - glass style
        subtle: "border-border/20 bg-white/5 backdrop-blur-sm text-muted-foreground dark:bg-white/5",
        // Glass pill variant
        glass: "border-white/10 bg-white/5 backdrop-blur-sm text-foreground/80",
        // Sand beige variant
        sand: "border-transparent bg-secondary/50 text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
