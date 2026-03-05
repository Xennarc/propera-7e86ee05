import { Check, Minus } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const ROWS = [
  { label: 'Pre-arrival + stay profiles',       propera: true,  stack: 'partial', manual: false },
  { label: 'Bookable activities & dining',       propera: true,  stack: 'partial', manual: false },
  { label: 'Transport requests',                 propera: true,  stack: false,     manual: false },
  { label: 'Room service ordering + status',     propera: true,  stack: 'partial', manual: false },
  { label: 'Housekeeping requests + routing',    propera: true,  stack: false,     manual: false },
  { label: 'Department operations views',        propera: true,  stack: false,     manual: false },
  { label: 'One operational schedule',           propera: true,  stack: false,     manual: false },
  { label: 'One login + permissions',            propera: true,  stack: false,     manual: false },
  { label: 'One source of truth',                propera: true,  stack: false,     manual: false },
] as const;

type CellValue = boolean | 'partial';

function Cell({ value, variant }: { value: CellValue; variant: 'propera' | 'stack' | 'manual' }) {
  if (value === true) {
    const bg = variant === 'propera' ? 'bg-primary/15' : 'bg-muted/40';
    const text = variant === 'propera' ? 'text-primary' : 'text-muted-foreground';
    return (
      <div className={`h-5 w-5 rounded-full ${bg} flex items-center justify-center`}>
        <Check className={`h-3 w-3 ${text}`} />
      </div>
    );
  }
  if (value === 'partial') {
    return <span className="text-[10px] text-muted-foreground/60 font-medium">Partial</span>;
  }
  return <Minus className="h-4 w-4 text-muted-foreground/25" />;
}

export function PricingStackComparison() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              One platform vs a stack.
            </h2>
          </RevealItem>

          <RevealItem className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground text-center mb-3 sm:hidden">
              ← Swipe to compare →
            </p>

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="lagoon-glass rounded-2xl overflow-hidden min-w-[480px] sm:min-w-0">
                {/* Header */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/20 border-b border-border/30">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground" />
                  <div className="text-xs sm:text-sm font-semibold text-primary text-center">Propera</div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground text-center">Traditional stack</div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground text-center">Manual ops</div>
                </div>

                {/* Rows */}
                {ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 transition-colors hover:bg-muted/10 ${
                      i !== ROWS.length - 1 ? 'border-b border-border/20' : ''
                    }`}
                  >
                    <div className="text-xs sm:text-sm text-foreground">{row.label}</div>
                    <div className="flex justify-center"><Cell value={row.propera} variant="propera" /></div>
                    <div className="flex justify-center"><Cell value={row.stack} variant="stack" /></div>
                    <div className="flex justify-center"><Cell value={row.manual} variant="manual" /></div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-5 max-w-md mx-auto leading-relaxed">
              Stacks create gaps. Gaps create service failures. Propera keeps the whole day coherent.
            </p>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
