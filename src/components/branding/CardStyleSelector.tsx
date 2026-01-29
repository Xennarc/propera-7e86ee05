import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardStyle = 'elevated' | 'outlined' | 'flat';

interface CardStyleSelectorProps {
  value: CardStyle;
  onChange: (style: CardStyle) => void;
}

const CARD_STYLES: { value: CardStyle; label: string; className: string; description: string }[] = [
  { 
    value: 'elevated', 
    label: 'Elevated', 
    className: 'shadow-md border-transparent bg-card',
    description: 'Subtle shadows' 
  },
  { 
    value: 'outlined', 
    label: 'Outlined', 
    className: 'border-2 border-border bg-card shadow-none',
    description: 'Clean borders' 
  },
  { 
    value: 'flat', 
    label: 'Flat', 
    className: 'border-transparent bg-muted/50 shadow-none',
    description: 'Minimal, no depth' 
  },
];

export function CardStyleSelector({ value, onChange }: CardStyleSelectorProps) {
  const currentValue = value || 'elevated';

  return (
    <div className="grid grid-cols-3 gap-3">
      {CARD_STYLES.map((style) => {
        const isActive = currentValue === style.value;
        
        return (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={cn(
              'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all',
              isActive
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            {/* Card Preview */}
            <div
              className={cn(
                'w-full h-12 rounded-lg mb-2 flex items-center justify-center text-xs text-muted-foreground',
                style.className
              )}
            >
              Card
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{style.label}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
            <span className="text-xs text-muted-foreground">{style.description}</span>
          </button>
        );
      })}
    </div>
  );
}
