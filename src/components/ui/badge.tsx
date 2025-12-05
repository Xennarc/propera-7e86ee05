import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: "text-foreground border-border/60",
        // Status variants
        confirmed: "border-transparent bg-success/15 text-success",
        pending: "border-transparent bg-warning/15 text-warning",
        cancelled: "border-transparent bg-destructive/15 text-destructive",
        completed: "border-transparent bg-primary/15 text-primary",
        noShow: "border-transparent bg-muted text-muted-foreground",
        // Utility variants
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        info: "border-transparent bg-info/15 text-info",
        // Subtle variants for tags
        subtle: "border-border/40 bg-muted/40 text-muted-foreground",
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
