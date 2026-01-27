import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

interface MobileFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isValid?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Adaptive form modal that uses:
 * - Full-screen drawer on mobile with sticky submit button
 * - Standard dialog on desktop
 * 
 * The submit button is pinned to the bottom and stays above the keyboard.
 */
export function MobileFormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  isValid = true,
  size = 'md',
  className,
}: MobileFormModalProps) {
  const isMobile = useIsMobile();
  const { keyboardInset, isKeyboardOpen } = useKeyboardInset();
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-focus first input
  useEffect(() => {
    if (open && !isMobile) {
      setTimeout(() => {
        const firstInput = formRef.current?.querySelector<HTMLInputElement>(
          'input:not([type="hidden"]), textarea, select'
        );
        firstInput?.focus();
      }, 100);
    }
  }, [open, isMobile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && isValid && !isSubmitting) {
      onSubmit();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Mobile: Full-screen drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[95vh] flex flex-col">
          {/* Header */}
          <DrawerHeader className="flex items-start justify-between px-4 py-4 border-b shrink-0">
            <div className="space-y-1 pr-8">
              <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
              {description && (
                <DrawerDescription className="text-sm text-muted-foreground">
                  {description}
                </DrawerDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-9 w-9"
              onClick={handleCancel}
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          {/* Form content - scrollable */}
          <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {children}
            </div>

            {/* Sticky footer - adjusts for keyboard */}
            <div
              className={cn(
                'shrink-0 px-4 py-4 border-t bg-background',
                'transition-all duration-200'
              )}
              style={{
                paddingBottom: isKeyboardOpen
                  ? `calc(${keyboardInset}px + 1rem)`
                  : 'calc(env(safe-area-inset-bottom) + 1rem)',
              }}
            >
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 h-12"
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="flex-1 h-12"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitLabel}
                </Button>
              </div>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Standard dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], 'overflow-hidden', className)}>
        <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
          <DialogHeader className="pb-4">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto py-4 -mx-6 px-6">
            {children}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
