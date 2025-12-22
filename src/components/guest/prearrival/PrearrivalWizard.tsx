import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, Plane, Utensils, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrearrivalProfile, PrearrivalSettings } from '@/hooks/usePrearrivalData';
import { useUpdatePrearrivalProfile } from '@/hooks/usePrearrivalData';

interface PrearrivalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PrearrivalProfile | null;
  settings: PrearrivalSettings;
  checkInDate: string;
  initialStep?: number;
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-free',
  'Dairy-free',
  'Pescatarian',
];

const WATER_COMFORT_LEVELS = [
  { value: 'confident', label: 'Confident swimmer' },
  { value: 'comfortable', label: 'Comfortable in water' },
  { value: 'beginner', label: 'Beginner/Learning' },
  { value: 'non-swimmer', label: 'Non-swimmer' },
];

const SPECIAL_OCCASIONS = [
  'Honeymoon',
  'Anniversary',
  'Birthday',
  'Engagement',
  'Babymoon',
  'Family reunion',
  'Retirement',
];

const TRANSFER_OPTIONS = [
  { value: 'seaplane', label: 'Seaplane' },
  { value: 'speedboat', label: 'Speedboat' },
  { value: 'domestic_flight', label: 'Domestic flight + boat' },
  { value: 'unsure', label: 'Not sure yet' },
];

export function PrearrivalWizard({
  open,
  onOpenChange,
  profile,
  settings,
  checkInDate,
  initialStep = 0,
}: PrearrivalWizardProps) {
  const { toast } = useToast();
  const updateProfile = useUpdatePrearrivalProfile();

  // Build active steps based on settings
  const steps: Array<{ id: string; title: string; icon: React.ReactNode }> = [];
  if (settings.show_arrival_details) {
    steps.push({ id: 'arrival', title: 'Arrival Details', icon: <Plane className="h-4 w-4" /> });
  }
  if (settings.show_preferences) {
    steps.push({ id: 'preferences', title: 'Preferences', icon: <Utensils className="h-4 w-4" /> });
  }
  if (settings.show_special_occasions) {
    steps.push({ id: 'occasions', title: 'Special Occasions', icon: <Heart className="h-4 w-4" /> });
  }
  steps.push({ id: 'review', title: 'Review', icon: <Sparkles className="h-4 w-4" /> });

  const [currentStep, setCurrentStep] = useState(0);
  
  // Form state - initialized from profile prop
  const [arrivalTime, setArrivalTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [transferPreference, setTransferPreference] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [waterComfort, setWaterComfort] = useState('');
  const [specialOccasions, setSpecialOccasions] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');

  // Reset form state when dialog opens - load from profile
  useEffect(() => {
    if (open) {
      // Map initialStep to actual step index based on enabled settings
      const mappedStep = Math.min(initialStep, steps.length - 1);
      setCurrentStep(mappedStep >= 0 ? mappedStep : 0);
      
      // Load profile data fresh each time dialog opens
      setArrivalTime(profile?.arrival_time || '');
      setFlightNumber(profile?.arrival_flight_number || '');
      setTransferPreference(profile?.transfer_preference || '');
      setDietaryPreferences(Array.isArray(profile?.dietary_preferences) ? profile.dietary_preferences : []);
      setAllergies(profile?.allergies || '');
      setWaterComfort(profile?.water_comfort_level || '');
      setSpecialOccasions(Array.isArray(profile?.special_occasions) ? profile.special_occasions : []);
      setSpecialRequests(profile?.special_requests || '');
    }
  }, [open, initialStep, steps.length, profile]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await updateProfile.mutateAsync({
        arrival_time: arrivalTime || undefined,
        arrival_flight_number: flightNumber || undefined,
        transfer_preference: transferPreference || undefined,
        dietary_preferences: dietaryPreferences.length > 0 ? dietaryPreferences : undefined,
        allergies: allergies || undefined,
        water_comfort_level: waterComfort || undefined,
        special_occasions: specialOccasions.length > 0 ? specialOccasions : undefined,
        special_requests: specialRequests || undefined,
      });

      toast({
        title: 'Details saved!',
        description: 'Thank you! Our team will prepare for your arrival.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving',
        description: 'Please try again.',
      });
    }
  };

  const toggleDietary = (value: string) => {
    setDietaryPreferences(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleOccasion = (value: string) => {
    setSpecialOccasions(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const currentStepData = steps[currentStep];

  const renderStepContent = () => {
    if (!currentStepData) return null;

    switch (currentStepData.id) {
      case 'arrival':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Expected arrival time</Label>
              <Input
                id="arrivalTime"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Check-in date: {format(new Date(checkInDate), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flightNumber">Flight number (optional)</Label>
              <Input
                id="flightNumber"
                placeholder="e.g., SQ422"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Transfer preference</Label>
              <Select value={transferPreference} onValueChange={setTransferPreference}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Dietary preferences</Label>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors",
                      dietaryPreferences.includes(option)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={dietaryPreferences.includes(option)}
                      onCheckedChange={() => toggleDietary(option)}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Food allergies</Label>
              <Textarea
                id="allergies"
                placeholder="Please list any food allergies..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Water comfort level</Label>
              <Select value={waterComfort} onValueChange={setWaterComfort}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your comfort level" />
                </SelectTrigger>
                <SelectContent>
                  {WATER_COMFORT_LEVELS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This helps us recommend suitable activities
              </p>
            </div>
          </div>
        );

      case 'occasions':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Are you celebrating anything special?</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPECIAL_OCCASIONS.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors",
                      specialOccasions.includes(option)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={specialOccasions.includes(option)}
                      onCheckedChange={() => toggleOccasion(option)}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialRequests">Any special requests?</Label>
              <Textarea
                id="specialRequests"
                placeholder="e.g., Surprise cake on first night, flower bed decoration..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Here's a summary of what you've shared. You can always update this later.
            </p>

            {(arrivalTime || flightNumber || transferPreference) && (
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-semibold text-sm mb-2">Arrival Details</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {arrivalTime && <li>Arrival time: {arrivalTime}</li>}
                  {flightNumber && <li>Flight: {flightNumber}</li>}
                  {transferPreference && (
                    <li>Transfer: {TRANSFER_OPTIONS.find(t => t.value === transferPreference)?.label}</li>
                  )}
                </ul>
              </div>
            )}

            {(dietaryPreferences.length > 0 || allergies || waterComfort) && (
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-semibold text-sm mb-2">Preferences</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {dietaryPreferences.length > 0 && (
                    <li>Dietary: {dietaryPreferences.join(', ')}</li>
                  )}
                  {allergies && <li>Allergies: {allergies}</li>}
                  {waterComfort && (
                    <li>Water comfort: {WATER_COMFORT_LEVELS.find(w => w.value === waterComfort)?.label}</li>
                  )}
                </ul>
              </div>
            )}

            {(specialOccasions.length > 0 || specialRequests) && (
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-semibold text-sm mb-2">Special Occasions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {specialOccasions.length > 0 && (
                    <li>Celebrating: {specialOccasions.join(', ')}</li>
                  )}
                  {specialRequests && <li>Requests: {specialRequests}</li>}
                </ul>
              </div>
            )}

            {!arrivalTime && !flightNumber && !transferPreference && 
             dietaryPreferences.length === 0 && !allergies && !waterComfort &&
             specialOccasions.length === 0 && !specialRequests && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No details shared yet.</p>
                <p className="text-sm">You can skip this or go back to add information.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStepData?.icon}
            {currentStepData?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 py-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "h-0.5 w-4 transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="py-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button 
              onClick={handleSubmit}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save & Complete'}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
