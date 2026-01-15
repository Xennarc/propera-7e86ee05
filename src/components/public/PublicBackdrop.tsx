import { cn } from '@/lib/utils';

/**
 * PublicBackdrop - Premium animated aurora background
 * 
 * Features:
 * - 3 aurora blobs with GPU-accelerated CSS animations (transform only)
 * - Subtle grain overlay for texture
 * - Optional vignette for depth
 * - Respects prefers-reduced-motion
 * - pointer-events-none for click-through
 * - Mobile-optimized (reduced sizes/opacity)
 */
export function PublicBackdrop({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        className
      )}
      aria-hidden="true"
    >
      {/* Base gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />

      {/* Aurora blob A - Top center, teal */}
      <div 
        className={cn(
          "aurora-blob aurora-blob-a",
          "absolute -top-[20%] left-1/2 -translate-x-1/2",
          "w-[80vw] h-[60vh] md:w-[60vw] md:h-[50vh]",
          "rounded-full blur-[80px] md:blur-[100px]",
          "bg-[radial-gradient(circle,hsl(var(--teal-400)/0.15)_0%,transparent_70%)]",
          "dark:bg-[radial-gradient(circle,hsl(var(--teal-400)/0.20)_0%,transparent_70%)]",
          "opacity-60 md:opacity-70"
        )}
      />

      {/* Aurora blob B - Mid left, lagoon blue */}
      <div 
        className={cn(
          "aurora-blob aurora-blob-b",
          "absolute top-[30%] -left-[15%]",
          "w-[70vw] h-[50vh] md:w-[50vw] md:h-[45vh]",
          "rounded-full blur-[70px] md:blur-[90px]",
          "bg-[radial-gradient(circle,hsl(var(--lagoon-400)/0.12)_0%,transparent_70%)]",
          "dark:bg-[radial-gradient(circle,hsl(var(--lagoon-400)/0.18)_0%,transparent_70%)]",
          "opacity-50 md:opacity-60"
        )}
      />

      {/* Aurora blob C - Bottom right, primary teal */}
      <div 
        className={cn(
          "aurora-blob aurora-blob-c",
          "absolute bottom-[5%] -right-[10%]",
          "w-[75vw] h-[55vh] md:w-[55vw] md:h-[50vh]",
          "rounded-full blur-[75px] md:blur-[95px]",
          "bg-[radial-gradient(circle,hsl(var(--primary)/0.10)_0%,transparent_70%)]",
          "dark:bg-[radial-gradient(circle,hsl(var(--primary)/0.16)_0%,transparent_70%)]",
          "opacity-50 md:opacity-60"
        )}
      />

      {/* Grain overlay - subtle texture */}
      <div 
        className={cn(
          "absolute inset-0",
          "bg-[url('/textures/grain.svg')] bg-repeat",
          "[background-size:180px_180px]",
          "opacity-[0.03] dark:opacity-[0.05]",
          "mix-blend-overlay pointer-events-none"
        )}
      />

      {/* Vignette - subtle edge darkening for depth */}
      <div 
        className={cn(
          "absolute inset-0",
          "bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,hsl(var(--background)/0.4)_100%)]",
          "dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,hsl(var(--background)/0.6)_100%)]"
        )}
      />
    </div>
  );
}
