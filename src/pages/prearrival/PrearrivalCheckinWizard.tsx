import { useState, useEffect, useCallback } from 'react';
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
  FileCheck, Sparkles, AlertCircle, Calendar, CheckCircle2,
  Cloud, Save, Loader2, PartyPopper, Copy, Download, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Badge } from '@/components/ui/badge';

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

const DIETARY_OPTIONS = [
  { value: 'Vegetarian', emoji: '🥬' },
  { value: 'Vegan', emoji: '🌱' },
  { value: 'Halal', emoji: '🍖' },
  { value: 'Kosher', emoji: '✡️' },
  { value: 'Gluten-free', emoji: '🌾' },
  { value: 'Dairy-free', emoji: '🥛' },
  { value: 'Pescatarian', emoji: '🐟' },
];

const WATER_COMFORT_LEVELS = [
  { value: 'confident', label: 'Confident swimmer', emoji: '🏊' },
  { value: 'comfortable', label: 'Comfortable in water', emoji: '🌊' },
  { value: 'beginner', label: 'Beginner/Learning', emoji: '🏖️' },
  { value: 'non-swimmer', label: 'Non-swimmer', emoji: '🏝️' },
];

const SPECIAL_OCCASIONS = [
  { value: 'Honeymoon', emoji: '💒' },
  { value: 'Anniversary', emoji: '💍' },
  { value: 'Birthday', emoji: '🎂' },
  { value: 'Engagement', emoji: '💎' },
  { value: 'Babymoon', emoji: '👶' },
  { value: 'Family reunion', emoji: '👨‍👩‍👧‍👦' },
  { value: 'Retirement', emoji: '🎉' },
];

const TRANSFER_OPTIONS = [
  { value: 'seaplane', label: 'Seaplane', emoji: '🛩️' },
  { value: 'speedboat', label: 'Speedboat', emoji: '🚤' },
  { value: 'domestic_flight', label: 'Domestic flight + boat', emoji: '✈️' },
  { value: 'unsure', label: 'Not sure yet', emoji: '❓' },
];

export default function PrearrivalCheckinWizard() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WizardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

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

  // Save progress on change with debounce
  useEffect(() => {
    if (!token || loading) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`${STORAGE_KEY}_${token}`, JSON.stringify(formData));
    }, 500);
    return () => clearTimeout(timeout);
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
  const steps: Array<{ id: string; title: string; subtitle: string; icon: React.ReactNode }> = [];
  
  if (data) {
    steps.push({ 
      id: 'confirm', 
      title: 'Confirm Stay', 
      subtitle: 'Review your booking',
      icon: <Calendar className="h-4 w-4" /> 
    });
    
    if (data.settings.show_arrival_details) {
      steps.push({ 
        id: 'arrival', 
        title: 'Arrival Details', 
        subtitle: 'Flight & transfers',
        icon: <Plane className="h-4 w-4" /> 
      });
    }
    if (data.settings.show_preferences) {
      steps.push({ 
        id: 'preferences', 
        title: 'Preferences', 
        subtitle: 'Dietary & comfort',
        icon: <Utensils className="h-4 w-4" /> 
      });
    }
    if (data.settings.show_special_occasions) {
      steps.push({ 
        id: 'occasions', 
        title: 'Special Occasions', 
        subtitle: 'Celebrations',
        icon: <Heart className="h-4 w-4" /> 
      });
    }
    if (data.settings.require_policy_acknowledgement || data.settings.require_esignature) {
      steps.push({ 
        id: 'policies', 
        title: 'Policies', 
        subtitle: 'Review & sign',
        icon: <FileCheck className="h-4 w-4" /> 
      });
    }
    steps.push({ 
      id: 'complete', 
      title: 'Complete', 
      subtitle: 'All done!',
      icon: <Sparkles className="h-4 w-4" /> 
    });
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
      setLastSaved(new Date());
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
      setShowConfetti(true);
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

  const handleNext = useCallback(async () => {
    // Auto-save on step change
    if (!saving && data) {
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
  }, [saving, data, currentStep, steps.length, saveMutation]);

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

  const handleSaveAndExit = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync();
      toast({
        title: 'Progress saved',
        description: 'You can continue where you left off anytime.',
      });
      navigate(`/prearrival/${token}`);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: 'Please try again.',
      });
    }
    setSaving(false);
  };

  const toggleArrayValue = (array: string[], value: string, setter: (val: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  // Animation variants
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your check-in...</p>
        </motion.div>
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
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  const renderStepContent = () => {
    switch (currentStepData?.id) {
      case 'confirm':
        return (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-muted/50 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Guest</span>
                <span className="font-medium">{data.guest.full_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {data.guest.room_number}
                </span>
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

            <label className="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer hover:bg-muted/30 transition-all group">
              <Checkbox
                checked={formData.stayConfirmed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, stayConfirmed: !!checked }))}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium group-hover:text-primary transition-colors">
                  I confirm these details are correct
                </span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  If anything has changed, please add a note below.
                </p>
              </div>
            </label>

            <div className="space-y-2">
              <Label className="text-sm">Anything changed? (optional)</Label>
              <Textarea
                value={formData.stayNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, stayNotes: e.target.value }))}
                placeholder="e.g., We're arriving a day later, party size changed..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'arrival':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Arrival time</Label>
                <Input
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Flight number</Label>
                <Input
                  value={formData.flightNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, flightNumber: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SQ422"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Transfer preference</Label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSFER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      formData.transferPreference === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="transfer"
                      value={opt.value}
                      checked={formData.transferPreference === opt.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, transferPreference: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Number of bags (optional)</Label>
              <Input
                type="number"
                min="0"
                value={formData.baggageCount}
                onChange={(e) => setFormData(prev => ({ ...prev, baggageCount: e.target.value }))}
                placeholder="e.g., 2"
                className="h-11 max-w-32"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Pickup notes (optional)</Label>
              <Textarea
                value={formData.pickupNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupNotes: e.target.value }))}
                placeholder="Any special pickup requirements..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm">Dietary preferences</Label>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      formData.dietaryPreferences.includes(option.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={formData.dietaryPreferences.includes(option.value)}
                      onCheckedChange={() => toggleArrayValue(
                        formData.dietaryPreferences, 
                        option.value, 
                        (val) => setFormData(prev => ({ ...prev, dietaryPreferences: val }))
                      )}
                    />
                    <span className="text-base">{option.emoji}</span>
                    <span className="text-sm">{option.value}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Food allergies</Label>
              <Textarea
                value={formData.allergies}
                onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                placeholder="Please list any food allergies or intolerances..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Water comfort level</Label>
              <Select 
                value={formData.waterComfort} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, waterComfort: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select your comfort level" />
                </SelectTrigger>
                <SelectContent>
                  {WATER_COMFORT_LEVELS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Helps us recommend suitable activities</p>
            </div>
          </div>
        );

      case 'occasions':
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm">Are you celebrating anything special?</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPECIAL_OCCASIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      formData.specialOccasions.includes(option.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={formData.specialOccasions.includes(option.value)}
                      onCheckedChange={() => toggleArrayValue(
                        formData.specialOccasions, 
                        option.value, 
                        (val) => setFormData(prev => ({ ...prev, specialOccasions: val }))
                      )}
                    />
                    <span className="text-base">{option.emoji}</span>
                    <span className="text-sm">{option.value}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Any special requests?</Label>
              <Textarea
                value={formData.specialRequests}
                onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="e.g., Surprise cake, flower decoration, room setup..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'policies':
        return (
          <div className="space-y-5">
            {data.settings.require_policy_acknowledgement && data.settings.policy_text && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-muted/50 max-h-48 overflow-y-auto text-sm prose prose-sm dark:prose-invert">
                  {data.settings.policy_text}
                </div>
                <label className="flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer hover:bg-muted/30 transition-all">
                  <Checkbox
                    checked={formData.policyAcknowledged}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, policyAcknowledged: !!checked }))}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">I have read and agree to the policies above</span>
                </label>
              </div>
            )}

            {data.settings.require_esignature && (
              <div className="space-y-4">
                {data.settings.esignature_instruction && (
                  <p className="text-sm text-muted-foreground">{data.settings.esignature_instruction}</p>
                )}
                <div className="space-y-2">
                  <Label className="text-sm">Type your full name to sign</Label>
                  <Input
                    value={formData.esignatureName}
                    onChange={(e) => setFormData(prev => ({ ...prev, esignatureName: e.target.value }))}
                    placeholder="Your full name"
                    className="h-12 text-base font-medium"
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
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 py-4"
          >
            {/* Success icon with animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-success/20 to-success/10 mx-auto"
            >
              <PartyPopper className="h-12 w-12 text-success" />
            </motion.div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Thank you for completing your pre-arrival check-in. We're looking forward to welcoming you!
              </p>
            </div>

            {/* Summary cards */}
            <div className="text-left space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Summary</h4>
              
              <div className="grid gap-3">
                {(formData.arrivalTime || formData.flightNumber || formData.transferPreference) && (
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Arrival</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {formData.arrivalTime && <p>Time: {formData.arrivalTime}</p>}
                      {formData.flightNumber && <p>Flight: {formData.flightNumber}</p>}
                      {formData.transferPreference && (
                        <p>Transfer: {TRANSFER_OPTIONS.find(o => o.value === formData.transferPreference)?.label}</p>
                      )}
                    </div>
                  </div>
                )}

                {(formData.dietaryPreferences.length > 0 || formData.allergies) && (
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="h-4 w-4 text-lagoon" />
                      <span className="font-medium text-sm">Preferences</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {formData.dietaryPreferences.length > 0 && (
                        <p>Dietary: {formData.dietaryPreferences.join(', ')}</p>
                      )}
                      {formData.allergies && <p>Allergies: {formData.allergies}</p>}
                    </div>
                  </div>
                )}

                {formData.specialOccasions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-coral" />
                      <span className="font-medium text-sm">Celebrating</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.specialOccasions.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* What's next */}
            <div className="pt-4 border-t text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">What's next?</span>{' '}
                On arrival, this automatically becomes your Guest Portal.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2 pt-2">
              {(data.settings.allow_activity_bookings || data.settings.allow_dining_bookings) && (
                <Button
                  size="lg"
                  onClick={() => navigate(`/prearrival/${token}/experiences`)}
                  className="w-full"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Plan Experiences
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate(`/prearrival/${token}`)}
                className="w-full"
              >
                Back to Overview
              </Button>
            </div>
          </motion.div>
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
          <div className="flex items-center gap-2">
            {/* Auto-save indicator */}
            <AnimatePresence mode="wait">
              {saving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Cloud className="h-3.5 w-3.5 animate-pulse" />
                  <span>Saving...</span>
                </motion.div>
              ) : lastSaved ? (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span>Saved</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b bg-muted/30">
        <div className="container max-w-2xl px-4 py-3">
          {/* Progress bar */}
          <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          
          {/* Step indicators - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 shrink-0">
                <motion.div
                  whileHover={!prefersReducedMotion ? { scale: 1.05 } : {}}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    index < currentStep
                      ? "bg-primary text-primary-foreground"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </motion.div>
                <span className={cn(
                  "text-xs hidden sm:inline whitespace-nowrap",
                  index === currentStep ? "font-medium" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-2xl px-4 py-6">
        <Card className="border-border/50">
          <CardContent className="p-5 md:p-6">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {currentStepData?.icon}
              </div>
              <div>
                <h2 className="font-semibold">{currentStepData?.title}</h2>
                <p className="text-xs text-muted-foreground">{currentStepData?.subtitle}</p>
              </div>
              <Badge variant="outline" className="ml-auto text-xs">
                Step {currentStep + 1} of {steps.length}
              </Badge>
            </div>

            {/* Step content with animation */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 gap-3">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 0 ? 'Back' : 'Previous'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAndExit}
            disabled={saving}
            className="hidden sm:flex"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save & Exit
          </Button>

          {isLastStep ? (
            completeMutation.isSuccess ? null : (
              <Button 
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="shrink-0"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    Complete Check-in
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )
          ) : (
            <Button onClick={handleNext} className="shrink-0">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
