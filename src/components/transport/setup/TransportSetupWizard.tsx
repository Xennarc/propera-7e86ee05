import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SetupProgressIndicator } from './SetupProgressIndicator';
import { StopsSetupStep } from './StopsSetupStep';
import { BuggiesSetupStep } from './BuggiesSetupStep';
import { DriversSetupStep } from './DriversSetupStep';
import { ReviewSetupStep } from './ReviewSetupStep';
import { useTransportStops } from '@/hooks/transport/useTransportStops';
import { useBuggies } from '@/hooks/transport/useBuggies';
import { useBuggyDrivers } from '@/hooks/transport/useBuggyDrivers';

interface TransportSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resortId: string | undefined;
  onComplete: () => void;
}

const STEPS = [
  { id: 'stops', title: 'Stops' },
  { id: 'buggies', title: 'Buggies' },
  { id: 'drivers', title: 'Drivers' },
  { id: 'review', title: 'Review' },
];

export function TransportSetupWizard({
  open,
  onOpenChange,
  resortId,
  onComplete,
}: TransportSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Fetch data to check step completion
  const { data: stops = [] } = useTransportStops(resortId);
  const { data: allBuggies = [] } = useBuggies(resortId);
  const { data: drivers = [] } = useBuggyDrivers(resortId);
  
  const buggies = allBuggies.filter(b => b.status !== 'out_of_service');
  
  // Determine which steps are complete
  const completedSteps: number[] = [];
  if (stops.length >= 2) completedSteps.push(0);
  if (buggies.length >= 1) completedSteps.push(1);
  if (drivers.length >= 1) completedSteps.push(2);
  
  // Can proceed to next step?
  const canProceed = (step: number): boolean => {
    switch (step) {
      case 0:
        return stops.length >= 2;
      case 1:
        return buggies.length >= 1;
      case 2:
        return drivers.length >= 1;
      default:
        return true;
    }
  };
  
  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);
  
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);
  
  const handleComplete = useCallback(() => {
    setIsCompleting(true);
    // Small delay to show loading state
    setTimeout(() => {
      onComplete();
      onOpenChange(false);
      setCurrentStep(0);
      setIsCompleting(false);
    }, 500);
  }, [onComplete, onOpenChange]);
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset step when closing
      setCurrentStep(0);
    }
    onOpenChange(newOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-center">Transport Setup</DialogTitle>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="px-6">
          <SetupProgressIndicator
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>
        
        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[400px]">
          {currentStep === 0 && <StopsSetupStep resortId={resortId} />}
          {currentStep === 1 && <BuggiesSetupStep resortId={resortId} />}
          {currentStep === 2 && <DriversSetupStep resortId={resortId} />}
          {currentStep === 3 && (
            <ReviewSetupStep
              resortId={resortId}
              onComplete={handleComplete}
              isCompleting={isCompleting}
            />
          )}
        </div>
        
        {/* Footer navigation */}
        {currentStep < 3 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed(currentStep)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
