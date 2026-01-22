import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardInset, scrollInputIntoView, dismissKeyboard } from '@/hooks/useKeyboardInset';

interface KeyboardSafeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  headerIcon?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  /** Additional class for the drawer container */
  className?: string;
  /** Height of drawer - defaults to 90vh */
  height?: string;
}

/**
 * KeyboardSafeDrawer - A mobile-optimized bottom drawer with keyboard awareness
 * 
 * Features:
 * - Fixed header with title and close button
 * - Scrollable body area with independent scrolling
 * - Sticky footer that stays above the on-screen keyboard
 * - Auto-scroll focused inputs into view
 * - Dismiss keyboard affordance (tap outside or Done button)
 * 
 * Uses visualViewport API to detect keyboard height and adjust padding
 * 
 * QA Checklist:
 * - [ ] iOS Safari: open → focus input → keyboard opens → footer visible above keyboard
 * - [ ] Android Chrome: same test
 * - [ ] iPhone SE: small screen test
 * - [ ] Long form content: scrolls independently, footer stays fixed
 * - [ ] Multi-item bundle: many items scroll, CTA visible
 */
export function KeyboardSafeDrawer({
  open,
  onOpenChange,
  title,
  description,
  headerIcon,
  footer,
  children,
  className,
  height = '90vh',
}: KeyboardSafeDrawerProps) {
  const { keyboardInset, isKeyboardOpen } = useKeyboardInset();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Handle input focus - scroll into view
  const handleFocusCapture = React.useCallback((e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    if (isInput) {
      // Small delay to let keyboard appear
      setTimeout(() => {
        scrollInputIntoView(target, scrollContainerRef.current, { offset: 80 });
      }, 150);
    }
  }, []);

  // Handle tap outside inputs to dismiss keyboard
  const handleContentClick = React.useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    
    if (!isInput && !isButton && isKeyboardOpen) {
      dismissKeyboard();
    }
  }, [isKeyboardOpen]);

  // Calculate safe area bottom for iOS
  const safeAreaBottom = React.useMemo(() => {
    // CSS env() isn't accessible in JS, so we use a fallback
    // This is applied via CSS as well
    return 0;
  }, []);

  // Footer padding accounts for keyboard + safe area
  const footerPadding = React.useMemo(() => {
    const baseBottomPadding = 16; // 1rem
    return keyboardInset + baseBottomPadding;
  }, [keyboardInset]);

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        {/* Overlay */}
        <SheetPrimitive.Overlay 
          className={cn(
            'fixed inset-0 z-50 bg-midnight-950/80 backdrop-blur-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        
        {/* Drawer Content */}
        <SheetPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'bg-background dark:bg-midnight-900',
            'rounded-t-3xl shadow-xl',
            'flex flex-col',
            'border-t border-border/30 dark:border-midnight-700/50',
            'transition ease-in-out',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'data-[state=closed]:duration-300 data-[state=open]:duration-500',
            className
          )}
          style={{ 
            height,
            maxHeight: `calc(100dvh - 40px)`,
          }}
          onClick={handleContentClick}
          onFocusCapture={handleFocusCapture}
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Fixed Header */}
          <div className="flex-shrink-0 px-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {headerIcon && (
                  <div className="flex-shrink-0">
                    {headerIcon}
                  </div>
                )}
                <div className="min-w-0">
                  <SheetPrimitive.Title className="text-lg font-semibold text-foreground truncate">
                    {title}
                  </SheetPrimitive.Title>
                  {description && (
                    <SheetPrimitive.Description className="text-sm text-muted-foreground">
                      {description}
                    </SheetPrimitive.Description>
                  )}
                </div>
              </div>
              
              {/* Close / Done button */}
              <SheetPrimitive.Close asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center justify-center rounded-xl p-2',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-muted/50 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30'
                  )}
                  aria-label="Close"
                >
                  {isKeyboardOpen ? (
                    <span className="text-sm font-medium px-1">Done</span>
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </button>
              </SheetPrimitive.Close>
            </div>
          </div>

          {/* Scrollable Body */}
          <div
            ref={scrollContainerRef}
            className={cn(
              'flex-1 overflow-y-auto overscroll-contain',
              'px-6 -webkit-overflow-scrolling-touch'
            )}
            style={{
              // Extra scroll padding at bottom for keyboard
              scrollPaddingBottom: keyboardInset + 100,
            }}
          >
            {children}
          </div>

          {/* Sticky Footer - stays above keyboard */}
          <div
            className={cn(
              'flex-shrink-0 px-6 pt-4 pb-4',
              'bg-background dark:bg-midnight-900',
              'border-t border-border/50',
              'transition-[padding] duration-200 ease-out'
            )}
            style={{
              paddingBottom: `calc(${footerPadding}px + env(safe-area-inset-bottom, 0px))`,
            }}
          >
            {footer}
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

/**
 * KeyboardSafeDrawer subcomponents for structured content
 */
export function DrawerSection({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 pb-5', className)}>
      {children}
    </div>
  );
}

export function DrawerSectionTitle({ 
  children,
  className,
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-sm font-medium text-foreground', className)}>
      {children}
    </h3>
  );
}
