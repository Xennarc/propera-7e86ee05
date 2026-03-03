import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { useUpdateReadiness } from '@/hooks/useBookingReadiness';
import { StickyActionBar } from '@/components/guest/StickyActionBar';
import { toast } from 'sonner';

interface WaiverStepProps {
  bookingId: string;
  activityName: string;
  onComplete: () => void;
  onBack: () => void;
}

const WAIVER_POINTS = [
  'I understand the nature and risks of this activity.',
  'I confirm I am in good health and fit to participate.',
  'I agree to follow all safety instructions from staff.',
  'I acknowledge the cancellation and refund policy.',
];

export function WaiverStep({ bookingId, activityName, onComplete, onBack }: WaiverStepProps) {
  const [checks, setChecks] = useState<boolean[]>(WAIVER_POINTS.map(() => false));
  const updateMutation = useUpdateReadiness();
  const allChecked = checks.every(Boolean);

  const toggleCheck = (idx: number) => {
    setChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handleSign = async () => {
    updateMutation.mutate(
      {
        bookingId,
        updates: {
          waiver_signed: true,
          waiver_signed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success('Waiver signed ✅');
          onComplete();
        },
        onError: () => toast.error('Failed to save waiver'),
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
          <h3 className="font-semibold text-foreground">Sign Waiver</h3>
          <p className="text-xs text-muted-foreground">{activityName}</p>
        </div>
      </div>

      <Card className="guest-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-medium">Participation Agreement</p>
          </div>

          <div className="space-y-3">
            {WAIVER_POINTS.map((point, idx) => (
              <button
                key={idx}
                onClick={() => toggleCheck(idx)}
                className="flex items-start gap-3 w-full text-left tap-target rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={checks[idx]}
                  onCheckedChange={() => toggleCheck(idx)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-snug">{point}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sticky CTA in thumb zone */}
      <StickyActionBar>
        <Button
          className="flex-1"
          size="lg"
          disabled={!allChecked || updateMutation.isPending}
          onClick={handleSign}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Sign & Continue
        </Button>
      </StickyActionBar>
    </div>
  );
}
