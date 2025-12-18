import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { format, parseISO } from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Check, Plane, Utensils, Heart, 
  FileCheck, Sparkles, AlertCircle, Calendar, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardData {
  guest: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
  resort: {
    id: string;
    name: string;
    login_logo_url: string | null;
  };
  settings: {
    show_arrival_details: boolean;
    show_preferences: boolean;
    show_special_occasions: boolean;
    require_policy_acknowledgement: boolean;
    policy_text: string | null;
    require_esignature: boolean;
    esignature_instruction: string | null;
    allow_activity_bookings: boolean;
    allow_dining_bookings: boolean;
  };
  profile: any;
  link: { id: string };
}

const STORAGE_KEY = 'propera_checkin_progress';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free', 'Pescatarian'];
const WATER_COMFORT_LEVELS = [
  { value: 'confident', label: 'Confident swimmer' },
  { value: 'comfortable', label: 'Comfortable in water' },
  { value: 'beginner', label: 'Beginner/Learning' },
  { value: 'non-swimmer', label: 'Non-swimmer' },
];
const SPECIAL_OCCASIONS = ['Honeymoon', 'Anniversary', 'Birthday', 'Engagement', 'Babymoon', 'Family reunion', 'Retirement'];
const TRANSFER_OPTIONS = [
  { value: 'seaplane', label: 'Seaplane' },
  { value: 'speedboat', label: 'Speedboat' },
  { value: 'domestic_flight', label: 'Domestic flight + boat' },
  { value: 'unsure', label: 'Not sure yet' },
];

export default function PrearrivalCheckinWizard() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WizardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    stayConfirmed: false,
    stayNotes: '',
    arrivalTime: '',
    flightNumber: '',
    transferPreference: '',
    baggageCount: '',
    pickupNotes: '',
    dietaryPreferences: [] as string[],
    allergies: '',
    waterComfort: '',
    specialOccasions: [] as string[],
    specialRequests: '',
    policyAcknowledged: false,
    esignatureName: '',
  });

  // Load saved progress
  useEffect(() => {
    if (!token) return;
    const saved = localStorage.getItem(`${STORAGE_KEY}_${token}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved progress', e);
      }
    }
  }, [token]);

  // Save progress on change
  useEffect(() => {
    if (!token || loading) return;
    localStorage.setItem(`${STORAGE_KEY}_${token}`, JSON.stringify(formData));
  }, [formData, token, loading]);

  // Validate and fetch data
  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setError('Invalid link');
        setLoading(false);
        return;
      }

      try {
        const { data: result, error: rpcError } = await supabase.rpc('validate_prearrival_link', {
          p_token: token,
          p_last_name: '', // Already verified on landing page
        });

        if (rpcError) throw rpcError;
        
        const validationResult = result as any;
        if (!validationResult?.success) {
          setError(validationResult?.error || 'Validation failed');
          setLoading(false);
          return;
        }

        setData(validationResult.data as WizardData);

        // Pre-fill from existing profile
        const profile = validationResult.data.profile;
        if (profile) {
          setFormData(prev => ({
            ...prev,
            stayConfirmed: profile.stay_confirmed || false,
            stayNotes: profile.stay_confirmation_notes || '',
            arrivalTime: profile.arrival_time || '',
            flightNumber: profile.arrival_flight_number || '',
            transferPreference: profile.transfer_preference || '',
            baggageCount: profile.baggage_count?.toString() || '',
            pickupNotes: profile.pickup_notes || '',
            dietaryPreferences: Array.isArray(profile.dietary_preferences) ? profile.dietary_preferences : [],
            allergies: profile.allergies || '',
            waterComfort: profile.water_comfort_level || '',
            specialOccasions: Array.isArray(profile.special_occasions) ? profile.special_occasions : [],
            specialRequests: profile.special_requests || '',
            policyAcknowledged: !!profile.policy_acknowledged_at,
            esignatureName: profile.esignature_name || '',
          }));
        }
      } catch (err) {
        console.error('Load error:', err);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Build steps based on settings
  const steps: Array<{ id: string; title: string; icon: React.ReactNode }> = [];
  
  if (data) {
    steps.push({ id: 'confirm', title: 'Confirm Stay', icon: <Calendar className="h-4 w-4" /> });
    
    if (data.settings.show_arrival_details) {
      steps.push({ id: 'arrival', title: 'Arrival Details', icon: <Plane className="h-4 w-4" /> });
    }
    if (data.settings.show_preferences) {
      steps.push({ id: 'preferences', title: 'Preferences', icon: <Utensils className="h-4 w-4" /> });
    }
    if (data.settings.show_special_occasions) {
      steps.push({ id: 'occasions', title: 'Special Occasions', icon: <Heart className="h-4 w-4" /> });
    }
    if (data.settings.require_policy_acknowledgement || data.settings.require_esignature) {
      steps.push({ id: 'policies', title: 'Policies', icon: <FileCheck className="h-4 w-4" /> });
    }
    steps.push({ id: 'complete', title: 'Complete', icon: <Sparkles className="h-4 w-4" /> });
  }

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!data) return;
      
      const { error } = await supabase.rpc('guest_update_prearrival_profile', {
        p_guest_id: data.guest.id,
        p_arrival_date: null,
        p_arrival_time: formData.arrivalTime || null,
        p_arrival_flight_number: formData.flightNumber || null,
        p_transfer_preference: formData.transferPreference || null,
        p_dietary_preferences: formData.dietaryPreferences.length > 0 ? JSON.stringify(formData.dietaryPreferences) : null,
        p_allergies: formData.allergies || null,
        p_room_preferences: null,
        p_water_comfort_level: formData.waterComfort || null,
        p_special_occasions: formData.specialOccasions.length > 0 ? JSON.stringify(formData.specialOccasions) : null,
        p_special_requests: formData.specialRequests || null,
        p_custom_answers_json: null,
      });

      if (error) throw error;
    },
  });

  // Complete check-in mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!token || !data) return;
      
      // First save all data
      await saveMutation.mutateAsync();

      // Then complete the check-in
      const { data: result, error } = await supabase.rpc('complete_prearrival_checkin', {
        p_token: token,
        p_policy_acknowledged: formData.policyAcknowledged,
        p_esignature_name: formData.esignatureName || null,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      localStorage.removeItem(`${STORAGE_KEY}_${token}`);
      queryClient.invalidateQueries({ queryKey: ['prearrival'] });
      toast({
        title: 'Check-in complete!',
        description: 'Thank you! We\'re looking forward to welcoming you.',
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to complete check-in',
      });
    },
  });

  const handleNext = async () => {
    // Auto-save on step change
    if (!saving) {
      setSaving(true);
      try {
        await saveMutation.mutateAsync();
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
      setSaving(false);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(`/prearrival/${token}`);
    }
  };

  const handleComplete = () => {
    completeMutation.mutate();
  };

  const toggleArrayValue = (array: string[], value: string, setter: (val: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error || 'Failed to load'}</p>
            <Button onClick={() => navigate(`/prearrival/${token}`)} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const renderStepContent = () => {
    switch (currentStepData?.id) {
      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Guest</span>
                <span className="font-medium">{data.guest.full_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">{data.guest.room_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{format(parseISO(data.guest.check_in_date), 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium">{format(parseISO(data.guest.check_out_date), 'EEE, MMM d, yyyy')}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={formData.stayConfirmed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, stayConfirmed: !!checked }))}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">I confirm these details are correct</span>
                <p className="text-sm text-muted-foreground">
                  If anything has changed, please add a note below.
                </p>
              </div>
            </label>

            <div className="space-y-2">
              <Label>Anything changed? (optional)</Label>
              <Textarea
                value={formData.stayNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, stayNotes: e.target.value }))}
                placeholder="e.g., We're arriving a day later, party size changed..."
                rows={3}
              />
            </div>
          </div>
        );

      case 'arrival':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Expected arrival time</Label>
              <Input
                type="time"
                value={formData.arrivalTime}
                onChange={(e) => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Flight number (optional)</Label>
              <Input
                value={formData.flightNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, flightNumber: e.target.value }))}
                placeholder="e.g., SQ422"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Transfer preference</Label>
              <Select 
                value={formData.transferPreference} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, transferPreference: value }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of bags (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.baggageCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, baggageCount: e.target.value }))}
                  placeholder="e.g., 2"
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pickup notes (optional)</Label>
              <Textarea
                value={formData.pickupNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupNotes: e.target.value }))}
                placeholder="Any special pickup requirements..."
                rows={2}
              />
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
                      formData.dietaryPreferences.includes(option)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={formData.dietaryPreferences.includes(option)}
                      onCheckedChange={() => toggleArrayValue(
                        formData.dietaryPreferences, 
                        option, 
                        (val) => setFormData(prev => ({ ...prev, dietaryPreferences: val }))
                      )}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Food allergies</Label>
              <Textarea
                value={formData.allergies}
                onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                placeholder="Please list any food allergies..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Water comfort level</Label>
              <Select 
                value={formData.waterComfort} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, waterComfort: value }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your comfort level" />
                </SelectTrigger>
                <SelectContent>
                  {WATER_COMFORT_LEVELS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Helps us recommend suitable activities</p>
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
                      formData.specialOccasions.includes(option)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={formData.specialOccasions.includes(option)}
                      onCheckedChange={() => toggleArrayValue(
                        formData.specialOccasions, 
                        option, 
                        (val) => setFormData(prev => ({ ...prev, specialOccasions: val }))
                      )}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Any special requests?</Label>
              <Textarea
                value={formData.specialRequests}
                onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="e.g., Surprise cake, flower decoration..."
                rows={3}
              />
            </div>
          </div>
        );

      case 'policies':
        return (
          <div className="space-y-6">
            {data.settings.require_policy_acknowledgement && data.settings.policy_text && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 max-h-48 overflow-y-auto text-sm">
                  {data.settings.policy_text}
                </div>
                <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={formData.policyAcknowledged}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, policyAcknowledged: !!checked }))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">I have read and agree to the policies above</span>
                </label>
              </div>
            )}

            {data.settings.require_esignature && (
              <div className="space-y-4">
                {data.settings.esignature_instruction && (
                  <p className="text-sm text-muted-foreground">{data.settings.esignature_instruction}</p>
                )}
                <div className="space-y-2">
                  <Label>Type your full name to sign</Label>
                  <Input
                    value={formData.esignatureName}
                    onChange={(e) => setFormData(prev => ({ ...prev, esignatureName: e.target.value }))}
                    placeholder="Your full name"
                    className="h-12 font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    Today's date: {format(new Date(), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground">
                Thank you for completing your pre-arrival check-in. We're looking forward to welcoming you!
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-muted/50 text-left space-y-2 text-sm">
              <h4 className="font-semibold">Summary</h4>
              {formData.arrivalTime && <p>Arrival: {formData.arrivalTime}</p>}
              {formData.flightNumber && <p>Flight: {formData.flightNumber}</p>}
              {formData.dietaryPreferences.length > 0 && (
                <p>Dietary: {formData.dietaryPreferences.join(', ')}</p>
              )}
              {formData.specialOccasions.length > 0 && (
                <p>Celebrating: {formData.specialOccasions.join(', ')}</p>
              )}
            </div>

            {(data.settings.allow_activity_bookings || data.settings.allow_dining_bookings) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate(`/prearrival/${token}/experiences`)}
                className="w-full"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Explore & Book Experiences
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container max-w-2xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {data.resort.login_logo_url && (
              <img src={data.resort.login_logo_url} alt="" className="h-6 w-auto" />
            )}
            <span className="font-medium text-sm">{data.resort.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Progress */}
      <div className="border-b bg-muted/30">
        <div className="container max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 shrink-0">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    index < currentStep
                      ? "bg-primary text-primary-foreground"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className={cn(
                  "text-xs hidden sm:inline",
                  index === currentStep ? "font-medium" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              {currentStepData?.icon}
              <h2 className="text-lg font-semibold">{currentStepData?.title}</h2>
              {saving && <span className="text-xs text-muted-foreground ml-auto">Saving...</span>}
            </div>

            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 0 ? 'Back' : 'Previous'}
          </Button>

          {isLastStep ? (
            completeMutation.isSuccess ? (
              <Button onClick={() => navigate(`/prearrival/${token}`)}>
                Back to Overview
              </Button>
            ) : (
              <Button 
                onClick={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? 'Completing...' : 'Complete Check-in'}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
