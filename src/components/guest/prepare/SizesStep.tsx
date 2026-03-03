import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ruler, CheckCircle2, Loader2, Plus, Minus } from 'lucide-react';
import { useUpdateReadiness, BookingReadiness } from '@/hooks/useBookingReadiness';
import { StickyActionBar } from '@/components/guest/StickyActionBar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SizesStepProps {
  bookingId: string;
  readiness: BookingReadiness | null | undefined;
  onComplete: () => void;
  onBack: () => void;
}

// Chip-based size options
const WETSUIT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 300,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center tap-target hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center font-semibold text-foreground">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center tap-target hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SizesStep({ bookingId, readiness, onComplete, onBack }: SizesStepProps) {
  const existing = (readiness?.sizes_data ?? {}) as Record<string, unknown>;

  const [wetsuitSize, setWetsuitSize] = useState<string>((existing.wetsuit_size as string) || '');
  const [shoeSize, setShoeSize] = useState<string>((existing.shoe_size as string) || '');
  const [heightCm, setHeightCm] = useState<number>((existing.height_cm as number) || 170);
  const [weightKg, setWeightKg] = useState<number>((existing.weight_kg as number) || 70);

  const updateMutation = useUpdateReadiness();

  const isValid = wetsuitSize && shoeSize;

  const handleSave = () => {
    updateMutation.mutate(
      {
        bookingId,
        updates: {
          sizes_confirmed: true,
          sizes_data: {
            wetsuit_size: wetsuitSize,
            shoe_size: shoeSize,
            height_cm: heightCm,
            weight_kg: weightKg,
          },
          sizes_confirmed_at: new Date().toISOString(),
          gear_confirmed: true,
          gear_confirmed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success('Sizes saved ✅');
          onComplete();
        },
        onError: () => toast.error('Failed to save sizes'),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h3 className="font-semibold text-foreground">Sizes & Preferences</h3>
          <p className="text-xs text-muted-foreground">Helps us prepare your gear</p>
        </div>
      </div>

      {/* Wetsuit Size */}
      <Card className="guest-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Wetsuit Size</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {WETSUIT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setWetsuitSize(size)}
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm font-medium transition-all tap-target',
                  wetsuitSize === size
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shoe Size */}
      <Card className="guest-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Shoe Size (EU)</p>
          <div className="flex flex-wrap gap-2">
            {SHOE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setShoeSize(size)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition-all tap-target',
                  shoeSize === size
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Height & Weight steppers */}
      <Card className="guest-card">
        <CardContent className="p-4 space-y-4">
          <Stepper label="Height (cm)" value={heightCm} onChange={setHeightCm} min={100} max={220} />
          <Stepper label="Weight (kg)" value={weightKg} onChange={setWeightKg} min={30} max={200} />
        </CardContent>
      </Card>

      <StickyActionBar>
        <Button
          className="flex-1"
          size="lg"
          disabled={!isValid || updateMutation.isPending}
          onClick={handleSave}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Save & Continue
        </Button>
      </StickyActionBar>
    </div>
  );
}
