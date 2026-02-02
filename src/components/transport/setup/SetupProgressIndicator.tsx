import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
}

interface SetupProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export function SetupProgressIndicator({
  steps,
  currentStep,
  completedSteps,
}: SetupProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.includes(index);
        const isPast = index < currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200',
                isCompleted || isPast
                  ? 'bg-primary text-primary-foreground'
                  : isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted || isPast ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1 transition-colors duration-200',
                  isPast || isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
