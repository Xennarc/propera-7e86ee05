import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Warm Editorial primitives — small, composable building blocks for public pages.
 * All scoped to the `.theme-warm-editorial` token system.
 */

// ---- Pill ----
type PillVariant = "obsidian" | "outline" | "sprig" | "ember";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
}

export function Pill({ variant = "obsidian", className, children, ...rest }: PillProps) {
  const styles: Record<PillVariant, string> = {
    obsidian: "bg-foreground text-background",
    outline: "bg-transparent text-foreground border border-foreground/15",
    sprig: "bg-accent text-accent-foreground",
    ember: "bg-destructive text-destructive-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
        styles[variant],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

// ---- StatusDot ----
type DotTone = "sprig" | "ember" | "sand" | "obsidian";

export function StatusDot({
  tone = "sprig",
  pulse = false,
  className,
}: {
  tone?: DotTone;
  pulse?: boolean;
  className?: string;
}) {
  const toneClass: Record<DotTone, string> = {
    sprig: "bg-accent",
    ember: "bg-destructive",
    sand: "bg-muted-foreground/40",
    obsidian: "bg-foreground",
  };
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)} aria-hidden>
      {pulse && (
        <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", toneClass[tone])} />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", toneClass[tone])} />
    </span>
  );
}

// ---- ObsidianIconTile ----
export function ObsidianIconTile({
  children,
  size = 40,
  className,
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[12px] bg-foreground text-background shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}

// ---- GraceNote — Instrument Serif italic accent ----
export function GraceNote({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  return (
    <Tag className={cn("we-grace text-foreground/85", className)}>
      {children}
    </Tag>
  );
}
