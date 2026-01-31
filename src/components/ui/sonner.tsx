import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Use top-center on mobile to avoid bottom nav overlap
      position={isMobile ? "top-center" : "bottom-right"}
      // On mobile, account for safe-area-inset-top; on desktop use standard offset
      offset={isMobile ? 16 : 16}
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border",
        },
      }}
      // Mobile-specific: ensure toasts don't get clipped by notches
      style={{
        // Safe area padding for iOS notch on top
        '--toast-offset-top': 'max(16px, env(safe-area-inset-top, 16px))',
        // Safe area padding for bottom (desktop only since mobile uses top)
        '--toast-offset-bottom': 'max(16px, env(safe-area-inset-bottom, 16px))',
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster, toast };
