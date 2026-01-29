import { useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardData } from '../CreateResortWizard';

const COLOR_PRESETS = [
  { 
    id: 'ocean', 
    name: 'Ocean Blue', 
    primary: '#0EA5E9', 
    accent: '#06B6D4',
    description: 'Clean and refreshing'
  },
  { 
    id: 'forest', 
    name: 'Forest Green', 
    primary: '#059669', 
    accent: '#10B981',
    description: 'Natural and calm'
  },
  { 
    id: 'sunset', 
    name: 'Sunset Orange', 
    primary: '#F97316', 
    accent: '#FB923C',
    description: 'Warm and inviting'
  },
  { 
    id: 'luxury', 
    name: 'Royal Purple', 
    primary: '#8B5CF6', 
    accent: '#A78BFA',
    description: 'Elegant and premium'
  },
  { 
    id: 'coral', 
    name: 'Coral Pink', 
    primary: '#EC4899', 
    accent: '#F472B6',
    description: 'Playful and vibrant'
  },
  { 
    id: 'midnight', 
    name: 'Midnight Blue', 
    primary: '#3B82F6', 
    accent: '#60A5FA',
    description: 'Professional and modern'
  },
];

interface QuickBrandingStepProps {
  data: WizardData;
  setField: (field: keyof WizardData, value: string | null) => void;
  onValidChange: (valid: boolean) => void;
}

export function QuickBrandingStep({ data, setField, onValidChange }: QuickBrandingStepProps) {
  // This step is always valid (branding is optional)
  useEffect(() => {
    onValidChange(true);
  }, [onValidChange]);

  const handleSelect = (presetId: string) => {
    setField('colorPreset', data.colorPreset === presetId ? null : presetId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Palette className="h-5 w-5 text-primary" />
          Quick Branding
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose a color preset for your guest portal. You can customize everything in detail later.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = data.colorPreset === preset.id;
          
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset.id)}
              className={cn(
                'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                'hover:shadow-md hover:-translate-y-0.5',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              
              {/* Color Preview */}
              <div className="flex gap-1.5 mb-3">
                <div
                  className="w-8 h-8 rounded-lg shadow-inner"
                  style={{ backgroundColor: preset.primary }}
                />
                <div
                  className="w-8 h-8 rounded-lg shadow-inner"
                  style={{ backgroundColor: preset.accent }}
                />
              </div>
              
              <p className="font-medium text-sm mb-0.5">{preset.name}</p>
              <p className="text-xs text-muted-foreground">{preset.description}</p>
            </button>
          );
        })}
      </div>

      {/* Skip hint */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span>
          {data.colorPreset 
            ? `Selected: ${COLOR_PRESETS.find(p => p.id === data.colorPreset)?.name}. Click again to deselect.`
            : 'This step is optional. You can skip it and customize branding later.'}
        </span>
      </div>
    </div>
  );
}

export { COLOR_PRESETS };
