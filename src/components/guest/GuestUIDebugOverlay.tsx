import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Visual UI Debug Overlay for Guest Portal.
 * Activated via ?uiDebug=1 query param.
 *
 * Shows:
 *  - Safe-area padding guides (red tint at top/bottom)
 *  - Fixed element bounding boxes (green outlines with labels)
 *  - Scroll container boundaries (blue dashed outlines)
 *  - CSS variable readout panel
 *
 * Dev-only: no production impact unless query param is present.
 */
export function GuestUIDebugOverlay() {
  const [searchParams] = useSearchParams();
  const active = searchParams.get('uiDebug') === '1';
  const [dismissed, setDismissed] = useState(false);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [fixedEls, setFixedEls] = useState<Array<{ tag: string; rect: DOMRect; classes: string }>>([]);
  const [scrollEls, setScrollEls] = useState<Array<{ tag: string; rect: DOMRect; classes: string }>>([]);

  const scan = useCallback(() => {
    if (!active || dismissed) return;

    // Read CSS variables
    const cs = getComputedStyle(document.documentElement);
    const varNames = [
      '--guest-nav-h',
      '--guest-safe-area-b',
      '--guest-overlay-h',
      '--guest-keyboard-inset',
      '--guest-safe-bottom',
      '--guest-overlay-bottom',
      '--guest-primary',
      '--guest-accent',
      '--guest-radius',
      '--guest-button-radius',
    ];
    const newVars: Record<string, string> = {};
    for (const v of varNames) {
      const val = cs.getPropertyValue(v).trim();
      if (val) newVars[v] = val;
    }
    newVars['viewport'] = `${window.innerWidth}×${window.innerHeight}`;
    newVars['dvh vs vh'] = `${Math.round(window.innerHeight)}px (innerHeight)`;
    setVars(newVars);

    // Find fixed elements
    const allEls = document.querySelectorAll('*');
    const fixed: typeof fixedEls = [];
    const scrollable: typeof scrollEls = [];

    allEls.forEach((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      // Skip tiny or invisible elements
      if (rect.width < 10 || rect.height < 10) return;

      if (style.position === 'fixed' || style.position === 'sticky') {
        // Skip our own overlay
        if ((el as HTMLElement).dataset.uiDebug) return;
        fixed.push({
          tag: el.tagName.toLowerCase(),
          rect,
          classes: (el.className && typeof el.className === 'string')
            ? el.className.split(' ').slice(0, 3).join(' ')
            : '',
        });
      }

      // Detect scroll containers
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 5
      ) {
        scrollable.push({
          tag: el.tagName.toLowerCase(),
          rect,
          classes: (el.className && typeof el.className === 'string')
            ? el.className.split(' ').slice(0, 3).join(' ')
            : '',
        });
      }
    });

    setFixedEls(fixed);
    setScrollEls(scrollable);
  }, [active, dismissed]);

  useEffect(() => {
    if (!active || dismissed) return;
    scan();
    const interval = setInterval(scan, 2000);
    return () => clearInterval(interval);
  }, [active, dismissed, scan]);

  if (!active || dismissed) return null;

  return (
    <>
      {/* Safe-area top indicator */}
      <div
        data-ui-debug="safe-top"
        className="fixed top-0 left-0 right-0 z-[9997] pointer-events-none"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full h-full bg-red-500/20 border-b border-red-400/40 border-dashed" />
        <div className="absolute bottom-0 left-1 text-[8px] font-mono text-red-500/80">
          safe-area-top
        </div>
      </div>

      {/* Safe-area bottom indicator */}
      <div
        data-ui-debug="safe-bottom"
        className="fixed bottom-0 left-0 right-0 z-[9997] pointer-events-none"
        style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="w-full h-full bg-red-500/20 border-t border-red-400/40 border-dashed" />
        <div className="absolute top-0 left-1 text-[8px] font-mono text-red-500/80">
          safe-area-bottom
        </div>
      </div>

      {/* Fixed element outlines */}
      {fixedEls.map((el, i) => (
        <div
          key={`fixed-${i}`}
          data-ui-debug="fixed-outline"
          className="fixed z-[9996] pointer-events-none border-2 border-green-500/60 border-dashed"
          style={{
            top: el.rect.top,
            left: el.rect.left,
            width: el.rect.width,
            height: el.rect.height,
          }}
        >
          <span className="absolute -top-3.5 left-0.5 text-[7px] font-mono text-green-500 bg-background/80 px-0.5 rounded whitespace-nowrap">
            fixed: &lt;{el.tag}&gt; {el.classes.slice(0, 30)}
          </span>
        </div>
      ))}

      {/* Scroll container outlines */}
      {scrollEls.map((el, i) => (
        <div
          key={`scroll-${i}`}
          data-ui-debug="scroll-outline"
          className="fixed z-[9996] pointer-events-none border-2 border-blue-500/50 border-dotted"
          style={{
            top: el.rect.top,
            left: el.rect.left,
            width: el.rect.width,
            height: el.rect.height,
          }}
        >
          <span className="absolute -top-3.5 right-0.5 text-[7px] font-mono text-blue-500 bg-background/80 px-0.5 rounded whitespace-nowrap">
            scroll: &lt;{el.tag}&gt;
          </span>
        </div>
      ))}

      {/* Variable readout panel */}
      <div
        data-ui-debug="panel"
        className={cn(
          'fixed top-2 right-2 z-[9999] max-w-[280px]',
          'bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg',
          'text-xs font-mono p-3 space-y-1'
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-primary font-semibold text-[11px]">
            <Eye className="h-3.5 w-3.5" />
            UI Debug
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
            <span className="text-muted-foreground truncate text-[10px]">
              {key.replace('--guest-', '')}
            </span>
            <span className="text-foreground font-medium shrink-0 text-[10px]">{value}</span>
          </div>
        ))}

        <div className="pt-1.5 border-t border-border/50 mt-1.5 space-y-0.5">
          <p className="text-[9px] text-muted-foreground">🟥 Red = safe-area insets</p>
          <p className="text-[9px] text-muted-foreground">🟩 Green = fixed/sticky elements</p>
          <p className="text-[9px] text-muted-foreground">🟦 Blue = scroll containers</p>
        </div>
      </div>
    </>
  );
}
