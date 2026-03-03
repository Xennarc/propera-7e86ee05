/**
 * BottomSheet – Mobile sheet modal that slides up from the bottom.
 * Built on top of vaul (Drawer) which is already installed.
 */
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, title, children, className }: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'rounded-t-2xl bg-background border-t border-border/40',
            'max-h-[85dvh] flex flex-col',
            'focus:outline-none',
            className,
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Title */}
          {title && (
            <div className="px-4 pb-3 pt-1">
              <Drawer.Title className="text-base font-semibold text-foreground">
                {title}
              </Drawer.Title>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-safe-bottom">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
