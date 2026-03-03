import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronRight, ShieldCheck, Ruler, Award, Loader2 } from 'lucide-react';
import { useBookingReadiness, useEnsureReadiness, BookingReadiness } from '@/hooks/useBookingReadiness';
import { WaiverStep } from './prepare/WaiverStep';
import { SizesStep } from './prepare/SizesStep';
import { CertUploadStep } from './prepare/CertUploadStep';

interface PrepareCardProps {
  bookingId: string;
  guestId: string;
  resortId: string;
  activityName: string;
  category: string;
  /** Compact inline view vs full-page */
  variant?: 'inline' | 'full';
  className?: string;
}

type PrepareStepKey = 'waiver' | 'sizes' | 'cert';

interface StepConfig {
  key: PrepareStepKey;
  label: string;
  icon: typeof ShieldCheck;
  isComplete: (r: BookingReadiness | null) => boolean;
  isRequired: (category: string) => boolean;
}

const STEPS: StepConfig[] = [
  {
    key: 'waiver',
    label: 'Sign Waiver',
    icon: ShieldCheck,
    isComplete: (r) => !!r?.waiver_signed,
    isRequired: () => true, // All activities need waiver
  },
  {
    key: 'sizes',
    label: 'Sizes & Preferences',
    icon: Ruler,
    isComplete: (r) => !!r?.sizes_confirmed,
    isRequired: () => true,
  },
  {
    key: 'cert',
    label: 'Upload Certification',
    icon: Award,
    isComplete: (r) => !!r?.cert_verified,
    isRequired: (cat) => cat === 'DIVE',
  },
];

export function PrepareCard({
  bookingId,
  guestId,
  resortId,
  activityName,
  category,
  variant = 'inline',
  className,
}: PrepareCardProps) {
  const { data: readiness, isLoading } = useBookingReadiness(bookingId);
  const ensureMutation = useEnsureReadiness();
  const [activeStep, setActiveStep] = useState<PrepareStepKey | null>(null);

  // Ensure readiness row exists on mount
  useEffect(() => {
    if (!isLoading && !readiness) {
      ensureMutation.mutate({ bookingId, guestId, resortId });
    }
  }, [isLoading, readiness, bookingId, guestId, resortId]);

  const applicableSteps = STEPS.filter((s) => s.isRequired(category));
  const completedCount = applicableSteps.filter((s) => s.isComplete(readiness ?? null)).length;
  const allComplete = completedCount === applicableSteps.length;
  const nextStep = applicableSteps.find((s) => !s.isComplete(readiness ?? null));

  if (isLoading || ensureMutation.isPending) {
    return (
      <Card className={cn('guest-card', className)}>
        <CardContent className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading preparation...</span>
        </CardContent>
      </Card>
    );
  }

  // If active step is open, show the step flow
  if (activeStep) {
    return (
      <div className={className}>
        {activeStep === 'waiver' && (
          <WaiverStep
            bookingId={bookingId}
            activityName={activityName}
            onComplete={() => setActiveStep(null)}
            onBack={() => setActiveStep(null)}
          />
        )}
        {activeStep === 'sizes' && (
          <SizesStep
            bookingId={bookingId}
            readiness={readiness}
            onComplete={() => setActiveStep(null)}
            onBack={() => setActiveStep(null)}
          />
        )}
        {activeStep === 'cert' && (
          <CertUploadStep
            bookingId={bookingId}
            resortId={resortId}
            onComplete={() => setActiveStep(null)}
            onBack={() => setActiveStep(null)}
          />
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <Card
        className={cn(
          'guest-card overflow-hidden transition-all cursor-pointer',
          allComplete
            ? 'border-success/30 bg-success/5'
            : 'border-primary/30 bg-primary/5',
          className
        )}
        onClick={() => nextStep && setActiveStep(nextStep.key)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Progress ring */}
            <div className="relative h-10 w-10 shrink-0">
              <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  strokeWidth="3"
                  className="stroke-muted"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${(completedCount / applicableSteps.length) * 94.25} 94.25`}
                  strokeLinecap="round"
                  className={allComplete ? 'stroke-success' : 'stroke-primary'}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {completedCount}/{applicableSteps.length}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {allComplete ? 'All set! ✅' : 'Prepare for your trip'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {allComplete
                  ? 'You\'re ready to go'
                  : `Next: ${nextStep?.label}`}
              </p>
            </div>

            {!allComplete && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 mt-2.5">
            {applicableSteps.map((step) => {
              const complete = step.isComplete(readiness ?? null);
              return (
                <button
                  key={step.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStep(step.key);
                  }}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors',
                    complete
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {complete ? <CheckCircle2 className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
                  {step.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant (for confirmation page)
  return (
    <Card className={cn('guest-card', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Prepare for {activityName}</h3>
          <Badge variant={allComplete ? 'confirmed' : 'pending'} className="text-[10px]">
            {completedCount}/{applicableSteps.length} done
          </Badge>
        </div>

        <div className="space-y-2">
          {applicableSteps.map((step, idx) => {
            const complete = step.isComplete(readiness ?? null);
            const Icon = step.icon;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all tap-target',
                  complete
                    ? 'border-success/30 bg-success/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                  complete ? 'bg-success/10' : 'bg-muted'
                )}>
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    complete ? 'text-success' : 'text-foreground'
                  )}>
                    {complete ? `${step.label} ✓` : step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {complete ? 'Completed' : 'Tap to complete'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
