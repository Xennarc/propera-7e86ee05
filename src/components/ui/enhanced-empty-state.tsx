import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon, ArrowRight } from "lucide-react";

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  variant?: "default" | "dashed" | "subtle" | "minimal" | "card";
  className?: string;
  hint?: string;
}

export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
  hint,
}: EnhancedEmptyStateProps) {
  const isMinimal = variant === "minimal";
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "dashed" && "rounded-2xl border-2 border-dashed border-border bg-muted/20 py-12 px-6",
        variant === "subtle" && "rounded-2xl bg-muted/30 py-12 px-6",
        variant === "default" && "rounded-2xl bg-card border border-border/50 py-12 px-6",
        isCard && "rounded-xl border border-dashed border-border/50 bg-muted/20 py-12 px-6",
        isMinimal && "py-8 px-4",
        className
      )}
    >
      {/* Icon with background */}
      <div
        className={cn(
          "rounded-full flex items-center justify-center mb-4",
          isMinimal 
            ? "h-12 w-12 bg-muted/50" 
            : "h-16 w-16 bg-gradient-to-br from-muted to-muted/50 shadow-sm"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground/60",
            isMinimal ? "h-6 w-6" : "h-8 w-8"
          )}
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold text-foreground",
          isMinimal ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "text-muted-foreground mt-1.5 max-w-md",
          isMinimal ? "text-sm" : "text-sm"
        )}
      >
        {description}
      </p>

      {/* Hint text */}
      {hint && (
        <p className="text-xs text-muted-foreground/70 mt-3 max-w-sm italic">
          {hint}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
          {secondaryAction && (
            <Button
              variant="outline"
              size={isMinimal ? "sm" : "default"}
              onClick={secondaryAction.onClick}
              asChild={!!secondaryAction.href}
            >
              {secondaryAction.href ? (
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              ) : (
                secondaryAction.label
              )}
            </Button>
          )}
          {action && (
            <Button
              size={isMinimal ? "sm" : "default"}
              onClick={action.onClick}
              asChild={!!action.href}
              className="gap-2"
            >
              {action.href ? (
                <a href={action.href}>
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <>
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Simple inline empty state for smaller contexts
interface InlineEmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineEmptyState({ message, action, className }: InlineEmptyStateProps) {
  return (
    <div className={cn("flex items-center justify-between py-4 px-3 text-sm text-muted-foreground rounded-lg bg-muted/30", className)}>
      <span>{message}</span>
      {action && (
        <Button variant="link" size="sm" onClick={action.onClick} className="h-auto p-0">
          {action.label}
        </Button>
      )}
    </div>
  );
}
