import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground sm:text-sm",
        "ring-offset-background transition-all duration-150",
        "placeholder:text-muted-foreground/60",
        "hover:border-border/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 focus-visible:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
