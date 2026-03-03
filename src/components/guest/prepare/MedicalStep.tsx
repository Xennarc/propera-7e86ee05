import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HeartPulse, CheckCircle2, Loader2 } from 'lucide-react';
import { useUpdateActivityBookingReadiness } from '@/hooks/useActivityBookingReadiness';
import { StickyActionBar } from '@/components/guest/StickyActionBar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CONDITION_CHIPS = [
  { key: 'asthma', label: 'Asthma' },
  { key: 'heart', label: 'Heart condition' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'recent_surgery', label: 'Recent surgery' },
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'back_neck', label: 'Back / Neck' },
  { key: 'epilepsy', label: 'Epilepsy' },
  { key: 'other', label: 'Other' },
] as const;

interface MedicalStepProps {
  bookingId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function MedicalStep({ bookingId, onComplete, onBack }: MedicalStepProps) {
  const [hasConditions, setHasConditions] = useState<boolean | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const updateMutation = useUpdateActivityBookingReadiness();

  const toggleCondition = (key: string) => {
    setSelectedConditions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleContinue = () => {
    const isDisclosed = hasConditions && selectedConditions.size > 0;
    const medicalStatus = isDisclosed ? 'review' : 'complete';
    const medicalReviewStatus = isDisclosed ? 'pending' : 'not_required';
    const answersJson = isDisclosed
      ? Object.fromEntries([...selectedConditions].map(k => [k, true]))
      : null;

    updateMutation.mutate(
      {
        bookingId,
        updates: {
          medical_status: medicalStatus as any,
          medical_review_status: medicalReviewStatus,
          medical_answers_json: answersJson,
        },
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

  const canContinue = hasConditions === false || (hasConditions === true && selectedConditions.size > 0);

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
              onClick={() => { setHasConditions(false); setSelectedConditions(new Set()); }}
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
              <p className="text-sm font-semibold">I have a condition</p>
              <p className="text-xs text-muted-foreground mt-1">Select below</p>
            </button>
          </div>

          {hasConditions && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select all that apply:</p>
              <div className="flex flex-wrap gap-2">
                {CONDITION_CHIPS.map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => toggleCondition(chip.key)}
                    className={cn(
                      'h-9 px-3.5 rounded-full text-sm font-medium transition-all border',
                      selectedConditions.has(chip.key)
                        ? 'bg-warning/15 text-warning border-warning/40 ring-1 ring-warning/20'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                Our team will review this before your session. No need to share more detail here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <StickyActionBar>
        <Button
          className="flex-1"
          size="lg"
          disabled={!canContinue || updateMutation.isPending}
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
