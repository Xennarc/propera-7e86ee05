import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonStyle = 'rounded' | 'pill' | 'squared';

interface ButtonStyleSelectorProps {
  value: ButtonStyle;
  onChange: (style: ButtonStyle) => void;
  primaryColor?: string;
}

const BUTTON_STYLES: { value: ButtonStyle; label: string; borderRadius: string; description: string }[] = [
  { value: 'rounded', label: 'Rounded', borderRadius: '8px', description: 'Modern default' },
  { value: 'pill', label: 'Pill', borderRadius: '9999px', description: 'Soft, approachable' },
  { value: 'squared', label: 'Square', borderRadius: '4px', description: 'Sharp, minimal' },
];

export function ButtonStyleSelector({ value, onChange, primaryColor = '#0E7490' }: ButtonStyleSelectorProps) {
  const currentValue = value || 'rounded';

  return (
    <div className="grid grid-cols-3 gap-3">
      {BUTTON_STYLES.map((style) => {
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
            {/* Button Preview */}
            <div
              className="px-4 py-1.5 text-xs font-medium text-white mb-2 transition-all"
              style={{ 
                backgroundColor: primaryColor,
                borderRadius: style.borderRadius 
              }}
            >
              Button
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
