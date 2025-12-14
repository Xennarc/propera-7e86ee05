import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Home, Calendar, Utensils, BookOpen, Award, X, ChevronRight 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: 'home' | 'activities' | 'dining' | 'bookings' | 'loyalty';
}

interface GuestOnboardingTourProps {
  showLoyalty?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const ONBOARDING_STORAGE_KEY = 'propera_guest_onboarding_completed';

export function useGuestOnboarding(guestId: string, resortId: string) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    const key = `${ONBOARDING_STORAGE_KEY}_${resortId}_${guestId}`;
    const completed = localStorage.getItem(key);
    if (!completed) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [guestId, resortId]);

  const completeOnboarding = () => {
    const key = `${ONBOARDING_STORAGE_KEY}_${resortId}_${guestId}`;
    localStorage.setItem(key, 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return { showOnboarding, completeOnboarding, skipOnboarding };
}

export function GuestOnboardingTour({ 
  showLoyalty = false, 
  onComplete, 
  onSkip 
}: GuestOnboardingTourProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const baseSteps: OnboardingStep[] = [
    {
      icon: <Home className="h-8 w-8" />,
      title: t('onboarding.homeTitle', 'Your Resort Hub'),
      description: t('onboarding.homeDescription', 'See your daily schedule, upcoming bookings, and personalized suggestions all in one place.'),
      highlight: 'home',
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: t('onboarding.activitiesTitle', 'Book Activities'),
      description: t('onboarding.activitiesDescription', 'Explore diving, excursions, spa treatments, and more. Book directly from your phone.'),
      highlight: 'activities',
    },
    {
      icon: <Utensils className="h-8 w-8" />,
      title: t('onboarding.diningTitle', 'Reserve Dining'),
      description: t('onboarding.diningDescription', 'Browse restaurants and reserve tables for breakfast, lunch, or dinner.'),
      highlight: 'dining',
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: t('onboarding.bookingsTitle', 'Your Schedule'),
      description: t('onboarding.bookingsDescription', 'View all your bookings, make changes, or cancel if plans change.'),
      highlight: 'bookings',
    },
  ];

  const loyaltyStep: OnboardingStep = {
    icon: <Award className="h-8 w-8" />,
    title: t('onboarding.loyaltyTitle', 'Earn Rewards'),
    description: t('onboarding.loyaltyDescription', 'Collect points on every booking and unlock exclusive perks with our loyalty program.'),
    highlight: 'loyalty',
  };

  const steps = showLoyalty ? [...baseSteps, loyaltyStep] : baseSteps;
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-2xl overflow-hidden">
            {/* Header with skip button */}
            <div className="flex justify-between items-center p-4 pb-0">
              <span className="text-xs text-muted-foreground font-medium">
                {currentStep + 1} of {totalSteps}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground -mr-2"
              >
                {t('common.skip', 'Skip')}
                <X className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <CardContent className="pt-4 pb-6">
              {/* Progress bar */}
              <Progress value={progress} className="h-1 mb-6" />

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    {currentStepData.icon}
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {currentStepData.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {currentStepData.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    {t('common.back', 'Back')}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="flex-1"
                >
                  {isLastStep ? t('onboarding.getStarted', 'Get Started') : t('common.next', 'Next')}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
