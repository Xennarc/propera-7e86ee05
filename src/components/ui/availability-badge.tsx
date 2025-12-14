import * as React from "react";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface AvailabilityBadgeProps {
  remaining: number;
  total?: number;
  showIcon?: boolean;
  className?: string;
}

export function AvailabilityBadge({
  remaining,
  total,
  showIcon = true,
  className,
}: AvailabilityBadgeProps) {
  const getAvailabilityLevel = (remaining: number, total?: number) => {
    if (remaining <= 0) return "full";
    if (remaining <= 2) return "scarce";
    if (total && remaining <= total * 0.25) return "limited";
    return "plenty";
  };

  const level = getAvailabilityLevel(remaining, total);

  const labels = {
    full: "Fully booked",
    scarce: `${remaining} left`,
    limited: `${remaining} available`,
    plenty: `${remaining} available`,
  };

  const classes = {
    full: "availability-full",
    scarce: "availability-scarce",
    limited: "availability-limited",
    plenty: "availability-plenty",
  };

  return (
    <span className={cn("flex items-center gap-1 text-sm", classes[level], className)}>
      {showIcon && <Users className="h-3.5 w-3.5" />}
      {labels[level]}
    </span>
  );
}

export function getAvailabilityClass(remaining: number, total?: number): string {
  if (remaining <= 0) return "availability-full";
  if (remaining <= 2) return "availability-scarce";
  if (total && remaining <= total * 0.25) return "availability-limited";
  return "availability-plenty";
}
