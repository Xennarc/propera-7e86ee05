import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HeartPulse, CheckCircle2, Loader2 } from 'lucide-react';
import { useUpdateActivityBookingReadiness } from '@/hooks/useActivityBookingReadiness';
import { StickyActionBar } from '@/components/guest/StickyActionBar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MedicalStepProps {
  bookingId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function MedicalStep({ bookingId, onComplete, onBack }: MedicalStepProps) {
  const [hasConditions, setHasConditions] = useState<boolean | null>(null);
  const updateMutation = useUpdateActivityBookingReadiness();

  const handleContinue = () => {
    const status = hasConditions ? 'review' : 'complete';
    updateMutation.mutate(
      {
        bookingId,
        updates: { medical_status: status as any },
      },
      {
        onSuccess: () => {
          toast.success('Medical info saved ✅');
          onComplete();
        },
        onError: () => toast.error('Failed to save'),
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
          <h3 className="font-semibold text-foreground">Medical Check</h3>
          <p className="text-xs text-muted-foreground">Quick health acknowledgement</p>
        </div>
      </div>

      <Card className="guest-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <HeartPulse className="h-5 w-5" />
            <p className="text-sm font-medium">Do you have any medical conditions we should know about?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setHasConditions(false)}
              className={cn(
                'rounded-xl border p-4 text-center transition-all tap-target',
                hasConditions === false
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              )}
            >
              <p className="text-sm font-semibold">No conditions</p>
              <p className="text-xs text-muted-foreground mt-1">I'm good to go</p>
            </button>
            <button
              onClick={() => setHasConditions(true)}
              className={cn(
                'rounded-xl border p-4 text-center transition-all tap-target',
                hasConditions === true
                  ? 'border-warning bg-warning/10 text-warning ring-1 ring-warning/20'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              )}
            >
              <p className="text-sm font-semibold">I'll inform staff</p>
              <p className="text-xs text-muted-foreground mt-1">On the day</p>
            </button>
          </div>

          {hasConditions && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              No need to share details here — just let the activity staff know when you arrive.
              They'll make sure everything is safe and comfortable for you.
            </p>
          )}
        </CardContent>
      </Card>

      <StickyActionBar>
        <Button
          className="flex-1"
          size="lg"
          disabled={hasConditions === null || updateMutation.isPending}
          onClick={handleContinue}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          {hasConditions ? 'Noted — Continue' : 'Confirm & Continue'}
        </Button>
      </StickyActionBar>
    </div>
  );
}
