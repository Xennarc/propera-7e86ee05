import { useState, useReducer, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, Palette, FileCheck, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResortDetailsStep } from './steps/ResortDetailsStep';
import { AdminSetupStep } from './steps/AdminSetupStep';
import { QuickBrandingStep } from './steps/QuickBrandingStep';
import { ReviewStep } from './steps/ReviewStep';

export interface WizardData {
  // Step 1: Resort Details
  name: string;
  code: string;
  timezone: string;
  currency: string;
  description: string;
  // Step 2: Admin Setup
  adminFullName: string;
  adminEmail: string;
  adminUsername: string;
  // Step 3: Quick Branding
  colorPreset: string | null;
  // Result after creation
  success?: {
    resortName: string;
    resortCode: string;
    adminEmail: string;
    adminUsername: string;
    emailSent: boolean;
    tempPassword?: string;
    signInLink: string;
  };
}

type WizardAction =
  | { type: 'SET_FIELD'; field: keyof WizardData; value: string | null }
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_SUCCESS'; success: WizardData['success'] }
  | { type: 'RESET' };

interface WizardState {
  step: number;
  data: WizardData;
}

const initialData: WizardData = {
  name: '',
  code: '',
  timezone: 'UTC',
  currency: 'USD',
  description: '',
  adminFullName: '',
  adminEmail: '',
  adminUsername: '',
  colorPreset: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, data: { ...state.data, [action.field]: action.value } };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_SUCCESS':
      return { ...state, data: { ...state.data, success: action.success } };
    case 'RESET':
      return { step: 0, data: initialData };
    default:
      return state;
  }
}

const STEPS = [
  { key: 'details', label: 'Details', icon: Building2 },
  { key: 'admin', label: 'Admin', icon: User },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'review', label: 'Review', icon: FileCheck },
];

interface CreateResortWizardProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function CreateResortWizard({ onSuccess, onClose }: CreateResortWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, { step: 0, data: initialData });
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});

  const { step, data } = state;

  const setField = useCallback((field: keyof WizardData, value: string | null) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      dispatch({ type: 'SET_STEP', step: step + 1 });
    }
  };

  const goBack = () => {
    if (step > 0) {
      dispatch({ type: 'SET_STEP', step: step - 1 });
    }
  };

  const setStepValid = useCallback((stepIndex: number, valid: boolean) => {
    setStepValidation(prev => ({ ...prev, [stepIndex]: valid }));
  }, []);

  // Memoized step validation callbacks to prevent infinite re-renders
  const onValidChangeStep0 = useCallback((valid: boolean) => {
    setStepValid(0, valid);
  }, [setStepValid]);

  const onValidChangeStep1 = useCallback((valid: boolean) => {
    setStepValid(1, valid);
  }, [setStepValid]);

  const onValidChangeStep2 = useCallback((valid: boolean) => {
    setStepValid(2, valid);
  }, [setStepValid]);

  const handleCreationSuccess = useCallback((success: WizardData['success']) => {
    dispatch({ type: 'SET_SUCCESS', success });
    onSuccess();
  }, [onSuccess]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <ResortDetailsStep
            data={data}
            setField={setField}
            onValidChange={onValidChangeStep0}
          />
        );
      case 1:
        return (
          <AdminSetupStep
            data={data}
            setField={setField}
            onValidChange={onValidChangeStep1}
          />
        );
      case 2:
        return (
          <QuickBrandingStep
            data={data}
            setField={setField}
            onValidChange={onValidChangeStep2}
          />
        );
      case 3:
        return (
          <ReviewStep
            data={data}
            onBack={goBack}
            onSuccess={handleCreationSuccess}
            onClose={onClose}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  // Show success state if creation completed
  if (data.success) {
    return (
      <ReviewStep
        data={data}
        onBack={goBack}
        onSuccess={handleCreationSuccess}
        onClose={onClose}
        onReset={handleReset}
      />
    );
  }

  const isCurrentStepValid = stepValidation[step] !== false;
  const showNavButtons = step < 3;

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, index) => {
            const StepIcon = s.icon;
            const isActive = index === step;
            const isCompleted = index < step;
            
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20'
                        : isCompleted
                          ? 'bg-primary/90 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium hidden sm:inline transition-colors',
                      isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-3 rounded-full transition-colors',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      {showNavButtons && (
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <button
            type="button"
            onClick={step === 0 ? onClose : goBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={!isCurrentStepValid}
            className={cn(
              'inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all',
              isCurrentStepValid
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {step === 2 ? (
              <>
                Review & Create
                <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
