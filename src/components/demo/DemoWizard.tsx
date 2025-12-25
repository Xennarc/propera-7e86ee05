import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DemoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEPARTMENTS = [
  { id: 'diving', label: 'Diving & Snorkeling' },
  { id: 'watersports', label: 'Watersports' },
  { id: 'spa', label: 'Spa & Wellness' },
  { id: 'excursions', label: 'Excursions & Tours' },
  { id: 'restaurants', label: 'Restaurants & Bars' },
  { id: 'fitness', label: 'Fitness & Recreation' },
  { id: 'kids', label: 'Kids Club' },
];

const ROOM_RANGES = [
  { value: '1-50', label: '1-50 rooms' },
  { value: '51-100', label: '51-100 rooms' },
  { value: '101-200', label: '101-200 rooms' },
  { value: '201-500', label: '201-500 rooms' },
  { value: '500+', label: '500+ rooms' },
];

const COUNTRIES = [
  { value: 'maldives', label: 'Maldives', timezone: 'Indian/Maldives' },
  { value: 'thailand', label: 'Thailand', timezone: 'Asia/Bangkok' },
  { value: 'indonesia', label: 'Indonesia', timezone: 'Asia/Jakarta' },
  { value: 'philippines', label: 'Philippines', timezone: 'Asia/Manila' },
  { value: 'mexico', label: 'Mexico', timezone: 'America/Cancun' },
  { value: 'caribbean', label: 'Caribbean', timezone: 'America/Puerto_Rico' },
  { value: 'uae', label: 'UAE', timezone: 'Asia/Dubai' },
  { value: 'mauritius', label: 'Mauritius', timezone: 'Indian/Mauritius' },
  { value: 'seychelles', label: 'Seychelles', timezone: 'Indian/Mahe' },
  { value: 'other', label: 'Other', timezone: 'UTC' },
];

export function DemoWizard({ open, onOpenChange }: DemoWizardProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'creating' | 'success'>('form');
  
  const [formData, setFormData] = useState({
    email: '',
    resortName: '',
    country: '',
    roomsRange: '',
    departments: [] as string[],
  });

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(deptId)
        ? prev.departments.filter(d => d !== deptId)
        : [...prev.departments, deptId]
    }));
  };

  const isFormValid = () => {
    return (
      formData.email.includes('@') &&
      formData.resortName.length >= 2 &&
      formData.country &&
      formData.roomsRange &&
      formData.departments.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    setStep('creating');

    try {
      const countryData = COUNTRIES.find(c => c.value === formData.country);
      
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: formData.email,
          resortName: formData.resortName,
          country: formData.country,
          timezone: countryData?.timezone || 'UTC',
          roomsRange: formData.roomsRange,
          departments: formData.departments,
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStep('success');
        toast.success('Your demo resort is ready!');
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          // Navigate to auth page with magic link or credentials
          if (data.loginUrl) {
            window.location.href = data.loginUrl;
          } else {
            navigate('/staff/auth');
          }
        }, 2000);
      } else {
        throw new Error(data?.error || 'Failed to create demo');
      }
    } catch (error: any) {
      console.error('Demo creation error:', error);
      toast.error(error.message || 'Failed to create demo. Please try again.');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('form');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Start Your Free Demo</DialogTitle>
              <DialogDescription>
                Tell us about your resort and we'll create a personalized demo in under a minute.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@resort.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resortName">Resort Name</Label>
                  <Input
                    id="resortName"
                    placeholder="Paradise Island Resort"
                    value={formData.resortName}
                    onChange={(e) => setFormData(prev => ({ ...prev, resortName: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(country => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Resort Size</Label>
                    <Select 
                      value={formData.roomsRange} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, roomsRange: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Departments to include</Label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {DEPARTMENTS.map(dept => (
                      <div key={dept.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={dept.id}
                          checked={formData.departments.includes(dept.id)}
                          onCheckedChange={() => handleDepartmentToggle(dept.id)}
                        />
                        <label
                          htmlFor={dept.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {dept.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-full font-semibold" 
                size="lg"
                disabled={!isFormValid() || isSubmitting}
              >
                Create My Demo Resort
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                No credit card required. 14-day full access.
              </p>
            </form>
          </>
        )}

        {step === 'creating' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Creating your demo resort...
            </h3>
            <p className="text-muted-foreground">
              Setting up activities, guests, and bookings
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Your demo is ready!
            </h3>
            <p className="text-muted-foreground mb-4">
              Redirecting you to your new resort...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Check your email for login details</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
