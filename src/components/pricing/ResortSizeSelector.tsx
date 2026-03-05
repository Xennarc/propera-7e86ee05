import { RESORT_SIZE_OPTIONS, type ResortSize } from '@/hooks/useResortSize';

interface ResortSizeSelectorProps {
  value: ResortSize;
  onChange: (size: ResortSize) => void;
}

export function ResortSizeSelector({ value, onChange }: ResortSizeSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-2 mb-6 md:mb-8 px-4">
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
        Resort size
      </span>
      {/* Fixed-width wrapper prevents layout jump when switching bands */}
      <div className="inline-flex rounded-full p-1 bg-muted/30 border border-border/30 backdrop-blur-sm">
        {RESORT_SIZE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              relative px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium 
              transition-all duration-200 whitespace-nowrap min-h-[44px]
              active:scale-95
              ${value === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/60">
        One guest stay = one room, check-in to check-out.
      </p>
    </div>
  );
}
