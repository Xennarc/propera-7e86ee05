import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Layout Debug Overlay for Guest Portal.
 * Activated via ?debugLayout=1 query param (follows existing ?debug=1 pattern).
 * Shows all bottom-stack CSS variables and a translucent boundary indicator.
 */
export function GuestLayoutDebugOverlay() {
  const [searchParams] = useSearchParams();
  const active = searchParams.get('debugLayout') === '1';
  const [dismissed, setDismissed] = useState(false);
  const [vars, setVars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!active || dismissed) return;

    const update = () => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      setVars({
        '--guest-nav-h': cs.getPropertyValue('--guest-nav-h').trim() || '(unset)',
        '--guest-safe-area-b': cs.getPropertyValue('--guest-safe-area-b').trim() || '0px',
        '--guest-overlay-h': cs.getPropertyValue('--guest-overlay-h').trim() || '0px',
        '--guest-keyboard-inset': cs.getPropertyValue('--guest-keyboard-inset').trim() || '0px',
        '--guest-safe-bottom': cs.getPropertyValue('--guest-safe-bottom').trim() || '(unset)',
        '--guest-overlay-bottom': cs.getPropertyValue('--guest-overlay-bottom').trim() || '(unset)',
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [active, dismissed]);

  if (!active || dismissed) return null;

  return (
    <>
      {/* Info panel — fixed top-right */}
      <div
        className={cn(
          'fixed top-2 right-2 z-[9999] max-w-[260px]',
          'bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg',
          'text-xs font-mono p-3 space-y-1.5'
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-primary font-semibold text-[11px]">
            <Layers className="h-3.5 w-3.5" />
            Layout Debug
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {Object.entries(vars).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-muted-foreground truncate">{key.replace('--guest-', '')}</span>
            <span className="text-foreground font-medium shrink-0">{value}</span>
          </div>
        ))}

        <div className="pt-1.5 border-t border-border/50 mt-1.5">
          <p className="text-[10px] text-muted-foreground">
            Red band = reserved safe area. Content below it would be hidden.
          </p>
        </div>
      </div>

      {/* Bottom boundary indicator — translucent red band showing the reserved area */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[9998] pointer-events-none"
        style={{ height: 'var(--guest-safe-bottom, 104px)' }}
      >
        <div className="w-full h-full bg-red-500/15 border-t-2 border-red-500/40 border-dashed" />
        <div className="absolute top-1 left-2 text-[9px] font-mono text-red-500/70">
          safe-bottom zone
        </div>
      </div>
    </>
  );
}
