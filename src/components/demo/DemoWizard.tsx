import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, CheckCircle2, Sparkles, ExternalLink, Mail, RotateCw, Key, User, DoorOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DemoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DemoResponse {
  email: string;
  temp_password?: string;
  tenant_id?: string;
  resort_code?: string;
  staff_login_url?: string;
  guest_login?: {
    guest_name: string;
    room_number: string;
    last_name: string;
    pin: string;
    portal_url: string;
  } | null;
  email_sent?: boolean;
  email_error?: string;
}

const DEPARTMENTS = [
  { id: 'dive', label: 'Dive' },
  { id: 'watersports', label: 'Watersports' },
  { id: 'spa', label: 'Spa' },
  { id: 'excursions', label: 'Excursions' },
  { id: 'dining', label: 'Dining' },
];

const ROOM_RANGES = [
  { value: '1-50', label: '1–50 rooms' },
  { value: '51-100', label: '51–100 rooms' },
  { value: '101-200', label: '101–200 rooms' },
  { value: '200+', label: '200+ rooms' },
];

const TIMEZONES = [
  { value: 'Indian/Maldives', label: 'Maldives (UTC+5)' },
  { value: 'Asia/Bangkok', label: 'Thailand (UTC+7)' },
  { value: 'Asia/Jakarta', label: 'Indonesia (UTC+7)' },
  { value: 'Asia/Manila', label: 'Philippines (UTC+8)' },
  { value: 'America/Cancun', label: 'Mexico/Caribbean (UTC-5)' },
  { value: 'Asia/Dubai', label: 'UAE (UTC+4)' },
  { value: 'Indian/Mauritius', label: 'Mauritius (UTC+4)' },
  { value: 'Indian/Mahe', label: 'Seychelles (UTC+4)' },
  { value: 'UTC', label: 'Other (UTC)' },
];

export function DemoWizard({ open, onOpenChange }: DemoWizardProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [step, setStep] = useState<'form' | 'creating' | 'success' | 'existing' | 'rate_limited'>('form');
  const [demoData, setDemoData] = useState<DemoResponse | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    resortName: '',
    timezone: '',
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
      formData.timezone &&
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
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: formData.email.trim().toLowerCase(),
          resort_name: formData.resortName.trim(),
          timezone: formData.timezone,
          rooms_range: formData.roomsRange,
          departments: formData.departments,
          mode: 'provision',
        }
      });

      if (error) throw error;

      if (data?.success) {
        const responseData: DemoResponse = {
          email: data.email || formData.email,
          temp_password: data.temp_password,
          tenant_id: data.tenant_id,
          resort_code: data.resort_code,
          staff_login_url: data.staff_login_url,
          guest_login: data.guest_login || null,
          email_sent: data.email_sent,
          email_error: data.email_error,
        };
        
        setDemoData(responseData);
        
        if (data.existing) {
          setStep('existing');
          toast.success('Fresh credentials sent to your email');
        } else {
          setStep('success');
          if (data.email_sent) {
            toast.success('Login details sent to your email');
          }
        }
      } else if (data?.error?.includes('Rate limit')) {
        setStep('rate_limited');
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

  const handleResendCredentials = async () => {
    if (isResending) return;
    
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: formData.email.trim().toLowerCase() || demoData?.email,
          mode: 'resend',
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Update state with new credentials
        setDemoData(prev => ({
          ...prev,
          email: data.email,
          temp_password: data.temp_password,
          staff_login_url: data.staff_login_url,
          guest_login: data.guest_login || null,
          email_sent: data.email_sent,
          email_error: data.email_error,
        }));
        
        if (data.email_sent) {
          toast.success('Fresh login credentials sent to your email');
        } else {
          toast.success('New credentials generated');
        }
      } else {
        throw new Error(data?.error || 'Failed to resend credentials');
      }
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.message || 'Failed to resend credentials');
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isResending) {
      setStep('form');
      setDemoData(null);
      onOpenChange(false);
    }
  };

  const goToStaffConsole = () => {
    handleClose();
    if (demoData?.staff_login_url) {
      try {
        const url = new URL(demoData.staff_login_url);
        navigate(url.pathname + url.search);
      } catch {
        navigate(`/staff/auth?username=${encodeURIComponent(demoData?.email || formData.email)}`);
      }
    } else {
      navigate(`/staff/auth?username=${encodeURIComponent(demoData?.email || formData.email)}`);
    }
  };

  const openGuestPortal = () => {
    if (demoData?.guest_login?.portal_url) {
      window.open(demoData.guest_login.portal_url, '_blank');
    } else if (demoData?.resort_code) {
      window.open(`/resort/${demoData.resort_code}/guest/login`, '_blank');
    } else {
      window.open('/guest', '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Create your demo workspace</DialogTitle>
              <DialogDescription>
                We'll generate a demo resort with realistic data so you can explore instantly.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@resort.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-muted-foreground">We'll send your login link here.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resortName">Resort name</Label>
                <Input
                  id="resortName"
                  placeholder="Your resort name"
                  value={formData.resortName}
                  onChange={(e) => setFormData(prev => ({ ...prev, resortName: e.target.value }))}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={formData.timezone} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resort size</Label>
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
                <Label>Departments — Select what you want to test</Label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {DEPARTMENTS.map(dept => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={dept.id}
                        checked={formData.departments.includes(dept.id)}
                        onCheckedChange={() => handleDepartmentToggle(dept.id)}
                      />
                      <label
                        htmlFor={dept.id}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {dept.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-full font-semibold" 
                size="lg"
                disabled={!isFormValid() || isSubmitting}
              >
                Create Demo Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                No spam. No selling your data. This is just to generate access and save your progress.
              </p>
            </form>
          </>
        )}

        {step === 'creating' && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Preparing your demo resort…
            </h3>
            <p className="text-muted-foreground mb-2">
              Seeding activities, sessions, guests, and bookings.
            </p>
            <p className="text-sm text-muted-foreground/70 italic">
              Making it feel like a real Tuesday at a busy resort.
            </p>
          </div>
        )}

        {step === 'success' && demoData && (
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Your demo is ready!</DialogTitle>
              <DialogDescription>
                Open the staff console, then try a booking in the guest portal.
              </DialogDescription>
            </DialogHeader>

            {/* Staff Login Credentials */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                <span>Staff Console</span>
              </div>
              <div className="space-y-1.5 pl-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-xs break-all">{demoData.email}</span>
                </div>
                {demoData.temp_password && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Password:</span>
                    <code className="font-mono bg-background px-2 py-0.5 rounded border text-sm">
                      {demoData.temp_password}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Login Credentials */}
            {demoData.guest_login && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DoorOpen className="h-4 w-4 text-success" />
                  <span>Guest Portal</span>
                </div>
                <div className="space-y-1.5 pl-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Guest:</span>
                    <span className="font-medium">{demoData.guest_login.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Room:</span>
                    <span className="font-medium">{demoData.guest_login.room_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">PIN:</span>
                    <code className="font-mono bg-background px-2 py-0.5 rounded border text-sm tracking-wider">
                      {demoData.guest_login.pin}
                    </code>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full rounded-full font-semibold"
                onClick={goToStaffConsole}
              >
                Open Staff Console
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full rounded-full font-semibold"
                onClick={openGuestPortal}
              >
                Open Guest Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 mt-6">
              {demoData.email_sent ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-success" />
                  <span>Login details sent to {formData.email}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Your demo stays active for 14 days. Upgrade anytime to go live.</span>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCredentials}
                disabled={isResending}
                className="text-muted-foreground hover:text-foreground"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 mr-2" />
                )}
                Resend login email
              </Button>
            </div>
          </div>
        )}

        {step === 'existing' && demoData && (
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Welcome back!</DialogTitle>
              <DialogDescription>
                Your demo workspace is still active. We've generated fresh credentials for you.
              </DialogDescription>
            </DialogHeader>

            {/* Staff Login Credentials */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                <span>Staff Console</span>
              </div>
              <div className="space-y-1.5 pl-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-xs break-all">{demoData.email}</span>
                </div>
                {demoData.temp_password && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Password:</span>
                    <code className="font-mono bg-background px-2 py-0.5 rounded border text-sm">
                      {demoData.temp_password}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Login Credentials */}
            {demoData.guest_login && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DoorOpen className="h-4 w-4 text-success" />
                  <span>Guest Portal</span>
                </div>
                <div className="space-y-1.5 pl-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Guest:</span>
                    <span className="font-medium">{demoData.guest_login.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Room:</span>
                    <span className="font-medium">{demoData.guest_login.room_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">PIN:</span>
                    <code className="font-mono bg-background px-2 py-0.5 rounded border text-sm tracking-wider">
                      {demoData.guest_login.pin}
                    </code>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full rounded-full font-semibold"
                onClick={goToStaffConsole}
              >
                Open Staff Console
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full rounded-full font-semibold"
                onClick={openGuestPortal}
              >
                Open Guest Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 mt-6">
              {demoData.email_sent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-success" />
                  <span>Credentials sent to your email</span>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCredentials}
                disabled={isResending}
                className="text-muted-foreground hover:text-foreground"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 mr-2" />
                )}
                Generate new credentials
              </Button>
            </div>
          </div>
        )}

        {step === 'rate_limited' && (
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
              <RotateCw className="h-8 w-8 text-warning" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Too many requests</DialogTitle>
              <DialogDescription>
                We limit demo creations to protect our service. Please try again in a few hours, or contact us for immediate access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full rounded-full font-semibold"
                onClick={() => window.open('mailto:hello@propera.cc?subject=Demo access request', '_blank')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full rounded-full"
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
