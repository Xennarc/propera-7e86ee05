import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColorPreset {
  name: string;
  primary: string;
  accent: string;
  background?: string;
  description: string;
}

interface ColorPresetCardProps {
  preset: ColorPreset;
  isActive: boolean;
  onClick: () => void;
}

export function ColorPresetCard({ preset, isActive, onClick }: ColorPresetCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left group',
        isActive
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* Color Swatches */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div
          className="w-6 h-6 rounded-lg border shadow-sm transition-transform group-hover:scale-110"
          style={{ backgroundColor: preset.primary }}
        />
        <div
          className="w-6 h-6 rounded-lg border shadow-sm transition-transform group-hover:scale-110"
          style={{ backgroundColor: preset.accent }}
        />
        {preset.background && (
          <div
            className="w-6 h-6 rounded-lg border shadow-sm transition-transform group-hover:scale-110"
            style={{ backgroundColor: preset.background }}
          />
        )}
        {isActive && (
          <Check className="h-4 w-4 text-primary ml-auto" />
        )}
      </div>
      
      <span className="text-sm font-medium">{preset.name}</span>
      <span className="text-xs text-muted-foreground line-clamp-1">{preset.description}</span>
    </button>
  );
}

export const ENHANCED_COLOR_PRESETS: ColorPreset[] = [
  { name: 'Ocean Teal', primary: '#0E7490', accent: '#D8C7A6', description: 'Default Propera theme' },
  { name: 'Tropical Paradise', primary: '#10B981', accent: '#FDE68A', background: '#F0FDF4', description: 'Fresh, vibrant island feel' },
  { name: 'Sunset Luxury', primary: '#DC2626', accent: '#FEF3C7', background: '#FFF7ED', description: 'Warm, upscale resort' },
  { name: 'Nordic Spa', primary: '#6366F1', accent: '#E0E7FF', background: '#F5F3FF', description: 'Calm, minimalist wellness' },
  { name: 'Midnight Premium', primary: '#A855F7', accent: '#1E1B4B', background: '#0F0F23', description: 'Dark mode luxury' },
  { name: 'Desert Oasis', primary: '#B45309', accent: '#FEFCE8', background: '#FFFBEB', description: 'Warm, earthy tones' },
  { name: 'Lagoon Blue', primary: '#0284C7', accent: '#A5F3FC', description: 'Fresh, aquatic' },
  { name: 'Forest Green', primary: '#059669', accent: '#D1FAE5', description: 'Natural, serene' },
  { name: 'Royal Purple', primary: '#7C3AED', accent: '#EDE9FE', description: 'Luxurious, bold' },
  { name: 'Coral Reef', primary: '#F43F5E', accent: '#FECDD3', description: 'Playful, energetic' },
  { name: 'Golden Sand', primary: '#B45309', accent: '#FEF3C7', description: 'Warm, earthy' },
  { name: 'Midnight Navy', primary: '#1E3A5F', accent: '#94A3B8', description: 'Classic, sophisticated' },
];
