import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

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
  variant?: "default" | "dashed" | "subtle";
  className?: string;
}

export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EnhancedEmptyStateProps) {
  return (
    <div
      className={cn(
        "empty-state rounded-2xl",
        variant === "dashed" && "border-2 border-dashed border-border bg-muted/20",
        variant === "subtle" && "bg-muted/30",
        variant === "default" && "bg-card border border-border/50",
        className
      )}
    >
      <div className="rounded-full bg-muted/60 p-4 mb-4">
        <Icon className="empty-state-icon h-10 w-10" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              asChild={!!action.href}
            >
              {action.href ? (
                <a href={action.href}>{action.label}</a>
              ) : (
                action.label
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
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
        </div>
      )}
    </div>
  );
}
