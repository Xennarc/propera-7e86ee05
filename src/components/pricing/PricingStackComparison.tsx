import { Check, Minus } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const ROWS = [
  { label: 'Pre-arrival + stay profiles', propera: true, stack: 'partial', manual: false },
  { label: 'Bookable activities & dining', propera: true, stack: 'partial', manual: false },
  { label: 'Transport requests', propera: true, stack: false, manual: false },
  { label: 'Room service ordering + status', propera: true, stack: 'partial', manual: false },
  { label: 'Housekeeping requests + routing', propera: true, stack: false, manual: false },
  { label: 'Department operations views', propera: true, stack: false, manual: false },
  { label: 'One operational schedule', propera: true, stack: false, manual: false },
  { label: 'One login + permissions', propera: true, stack: false, manual: false },
  { label: 'One source of truth', propera: true, stack: false, manual: false },
] as const;

type CellValue = boolean | 'partial';

function Cell({ value, isPropera }: { value: CellValue; isPropera: boolean }) {
  if (value === true) {
    return (
      <Check
        className={`h-4 w-4 mx-auto ${isPropera ? 'text-primary' : 'text-muted-foreground'}`}
        strokeWidth={2.25}
      />
    );
  }
  if (value === 'partial') {
    return (
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
        Partial
      </span>
    );
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />;
}

export function PricingStackComparison() {
  return (
    <section className="py-[60px] md:py-[80px] relative overflow-x-clip border-t border-border/50">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            {/* Editorial headline column */}
            <RevealItem className="md:col-span-5 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">
                One platform, not a stack
              </p>
              <h2 className="font-serif text-[28px] md:text-[44px] font-bold leading-[1.05] md:leading-[1.0] tracking-[-0.8px] md:tracking-[-1.2px] text-foreground mb-5 break-words">
                Stacks create gaps.{' '}
                <em className="not-italic text-primary">Gaps create service failures.</em>
              </h2>
              <p className="text-[15px] font-light leading-[1.65] text-muted-foreground max-w-sm">
                Propera keeps the whole day coherent — from the guest's first tap to the team's
                next shift.
              </p>
            </RevealItem>

            {/* Comparison table */}
            <RevealItem className="md:col-span-7 min-w-0">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="min-w-[360px] sm:min-w-0">
                  {/* Header */}
                  <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] gap-1.5 sm:gap-3 pb-3 border-b border-border/60">
                    <div />
                    <div className="text-[10px] font-semibold text-primary tracking-[1.5px] uppercase text-center">
                      Propera
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground tracking-[1.5px] uppercase text-center">
                      Stack
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground tracking-[1.5px] uppercase text-center">
                      Manual
                    </div>
                  </div>

                  {/* Rows */}
                  {ROWS.map((row, i) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] gap-2 sm:gap-3 py-3 ${
                        i !== ROWS.length - 1 ? 'border-b border-border/25' : ''
                      }`}
                    >
                      <div className="text-[13px] text-foreground/90">{row.label}</div>
                      <div className="flex items-center justify-center">
                        <Cell value={row.propera} isPropera />
                      </div>
                      <div className="flex items-center justify-center">
                        <Cell value={row.stack} isPropera={false} />
                      </div>
                      <div className="flex items-center justify-center">
                        <Cell value={row.manual} isPropera={false} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealItem>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
