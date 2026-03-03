import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronRight, ShieldCheck, Ruler, Award, HeartPulse, Loader2 } from 'lucide-react';
import {
  useActivityBookingReadiness,
  useUpdateActivityBookingReadiness,
  ActivityBookingReadiness,
} from '@/hooks/useActivityBookingReadiness';
import { parseActivityRequirements, ActivityRequirements } from '@/lib/activity-requirements';
import { WaiverStep } from './prepare/WaiverStep';
import { MedicalStep } from './prepare/MedicalStep';
import { SizesStep } from './prepare/SizesStep';
import { CertUploadStep } from './prepare/CertUploadStep';
import { supabase } from '@/integrations/supabase/client';

interface PrepareCardProps {
  bookingId: string;
  guestId: string;
  resortId: string;
  activityName: string;
  category: string;
  requirementsJson?: unknown;
  /** Compact inline view vs full-page */
  variant?: 'inline' | 'full';
  className?: string;
}

type PrepareStepKey = 'waiver' | 'medical' | 'gear' | 'cert';

interface StepConfig {
  key: PrepareStepKey;
  label: string;
  icon: typeof ShieldCheck;
  isComplete: (r: ActivityBookingReadiness | null) => boolean;
  requirementKey: keyof ActivityRequirements;
}

const STEPS: StepConfig[] = [
  {
    key: 'waiver',
    label: 'Sign Waiver',
    icon: ShieldCheck,
    isComplete: (r) => r?.waiver_status === 'complete',
    requirementKey: 'requires_waiver',
  },
  {
    key: 'medical',
    label: 'Medical Check',
    icon: HeartPulse,
    isComplete: (r) => r?.medical_status === 'complete' || r?.medical_status === 'review',
    requirementKey: 'requires_medical',
  },
  {
    key: 'gear',
    label: 'Sizes & Gear',
    icon: Ruler,
    isComplete: (r) => r?.gear_status === 'complete',
    requirementKey: 'requires_gear',
  },
  {
    key: 'cert',
    label: 'Upload Certification',
    icon: Award,
    isComplete: (r) => r?.cert_status === 'uploaded' || r?.cert_status === 'not_required',
    requirementKey: 'requires_cert',
  },
];

export function PrepareCard({
  bookingId,
  guestId,
  resortId,
  activityName,
  category,
  requirementsJson,
  variant = 'inline',
  className,
}: PrepareCardProps) {
  const opsEnabled = useFeatureEnabled('enable_activities_ops');
  const { data: readiness, isLoading } = useActivityBookingReadiness(bookingId);
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<PrepareStepKey | null>(null);

  // Upsert readiness if trigger didn't create it
  const [ensured, setEnsured] = useState(false);
  useEffect(() => {
    if (!isLoading && !readiness && !ensured) {
      setEnsured(true);
      supabase
        .from('activity_bookings')
        .select('session_id')
        .eq('id', bookingId)
        .single()
        .then(({ data }) => {
          if (data?.session_id) {
            supabase
              .from('activity_booking_readiness')
              .upsert({
                booking_id: bookingId,
                guest_id: guestId,
                resort_id: resortId,
                session_id: data.session_id,
              }, { onConflict: 'booking_id' })
              .then(() => {
                // Invalidate so the card picks up the new row
                queryClient.invalidateQueries({ queryKey: ['activity-booking-readiness', bookingId] });
              });
          }
        });
    }
  }, [isLoading, readiness, ensured, bookingId, guestId, resortId, queryClient]);

  const requirements = parseActivityRequirements(requirementsJson, category);

  // If ops module disabled, don't show PrepareCard
  if (!opsEnabled) return null;

  const applicableSteps = STEPS.filter((s) => requirements[s.requirementKey]);
  const completedCount = applicableSteps.filter((s) => s.isComplete(readiness ?? null)).length;
  const allComplete = completedCount === applicableSteps.length;
  const nextStep = applicableSteps.find((s) => !s.isComplete(readiness ?? null));

  if (isLoading) {
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
        {activeStep === 'medical' && (
          <MedicalStep
            bookingId={bookingId}
            onComplete={() => setActiveStep(null)}
            onBack={() => setActiveStep(null)}
          />
        )}
        {activeStep === 'gear' && (
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
            guestId={guestId}
            onComplete={() => setActiveStep(null)}
            onBack={() => setActiveStep(null)}
          />
        )}
      </div>
    );
  }

  if (applicableSteps.length === 0) return null;

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
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
            allComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
          )}>
            {completedCount}/{applicableSteps.length} done
          </span>
        </div>

        <div className="space-y-2">
          {applicableSteps.map((step) => {
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
