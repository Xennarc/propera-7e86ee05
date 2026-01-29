import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
  primaryColor?: string;
}

export function RadiusSlider({ value, onChange, primaryColor = '#0E7490' }: RadiusSliderProps) {
  const currentValue = value ?? 12;

  const getRadiusLabel = (val: number) => {
    if (val <= 4) return 'Sharp';
    if (val <= 8) return 'Subtle';
    if (val <= 12) return 'Moderate';
    if (val <= 18) return 'Rounded';
    return 'Very Rounded';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Corner Radius</Label>
        <span className="text-sm text-muted-foreground">
          {currentValue}px · {getRadiusLabel(currentValue)}
        </span>
      </div>
      
      <Slider
        value={[currentValue]}
        onValueChange={([val]) => onChange(val)}
        min={0}
        max={24}
        step={2}
        className="w-full"
      />
      
      {/* Preview Row */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1 flex items-center gap-2">
          <div 
            className="w-10 h-10 bg-muted transition-all"
            style={{ borderRadius: `${currentValue}px` }}
          />
          <span className="text-xs text-muted-foreground">Card</span>
        </div>
        
        <div className="flex-1 flex items-center gap-2">
          <div 
            className="px-3 py-1.5 text-xs font-medium text-white transition-all"
            style={{ 
              backgroundColor: primaryColor,
              borderRadius: `${Math.min(currentValue, 999)}px` 
            }}
          >
            Button
          </div>
        </div>
        
        <div className="flex-1 flex items-center gap-2">
          <div 
            className="w-8 h-8 border-2 border-input bg-background transition-all"
            style={{ borderRadius: `${Math.max(currentValue - 4, 2)}px` }}
          />
          <span className="text-xs text-muted-foreground">Input</span>
        </div>
      </div>
    </div>
  );
}
