import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FontPreset {
  name: string;
  family: string;
  description: string;
  googleFontUrl?: string;
}

interface FontPresetSelectorProps {
  value: string;
  onChange: (family: string) => void;
}

export const FONT_PRESETS: FontPreset[] = [
  { 
    name: 'Default', 
    family: 'Plus Jakarta Sans', 
    description: 'Modern professional',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Elegant', 
    family: 'Playfair Display', 
    description: 'Classic luxury',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Clean', 
    family: 'Inter', 
    description: 'Minimal tech',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Friendly', 
    family: 'Nunito', 
    description: 'Approachable rounded',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Bold', 
    family: 'Montserrat', 
    description: 'Strong contemporary',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap'
  },
  { 
    name: 'Premium', 
    family: 'DM Sans', 
    description: 'Refined geometric',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
  },
];

export function FontPresetSelector({ value, onChange }: FontPresetSelectorProps) {
  const currentValue = value || 'Plus Jakarta Sans';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {FONT_PRESETS.map((preset) => {
        const isActive = currentValue === preset.family;
        
        return (
          <button
            key={preset.family}
            type="button"
            onClick={() => onChange(preset.family)}
            className={cn(
              'relative flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left',
              isActive
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            {/* Font Preview */}
            <div 
              className="text-lg font-semibold mb-1.5 truncate w-full"
              style={{ fontFamily: `"${preset.family}", sans-serif` }}
            >
              Aa
            </div>
            
            <div className="flex items-center gap-1 w-full">
              <span className="text-sm font-medium truncate">{preset.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-auto" />}
            </div>
            <span className="text-xs text-muted-foreground">{preset.description}</span>
          </button>
        );
      })}
    </div>
  );
}
