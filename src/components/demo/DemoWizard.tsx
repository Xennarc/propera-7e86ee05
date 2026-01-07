import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, CheckCircle2, Sparkles, ExternalLink, Mail, RotateCw, Key, User, DoorOpen, Database, AlertTriangle, Inbox, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CredentialRow } from './CredentialRow';
import { TimezoneSelect } from './TimezoneSelect';
import { useDemoWorkspace, DemoCredentials } from '@/hooks/useDemoWorkspace';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DemoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeMode?: boolean;
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

export function DemoWizard({ open, onOpenChange, resumeMode = false }: DemoWizardProps) {
  const navigate = useNavigate();
  const {
    savedEmail,
    workspace,
    saveWorkspace,
    clearWorkspace,
    regenerateCredentials,
    reseedData,
  } = useDemoWorkspace();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [step, setStep] = useState<'form' | 'creating' | 'email_sent' | 'success' | 'existing' | 'rate_limited'>('form');
  const [demoData, setDemoData] = useState<DemoCredentials | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    resortName: '',
    timezone: '',
    roomsRange: '',
    departments: [] as string[],
  });

  // Auto-populate form with saved email if resuming
  useEffect(() => {
    if (resumeMode && savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
    }
  }, [resumeMode, savedEmail]);

  // If resuming with existing workspace, fetch fresh credentials
  useEffect(() => {
    if (resumeMode && open && savedEmail) {
      handleResumeDemo();
    }
  }, [resumeMode, open, savedEmail]);

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
        // Save workspace ID
        if (data.workspace_id) {
          saveWorkspace(data.workspace_id, data.email || formData.email);
        }

        const responseData: DemoCredentials = {
          email: data.email || formData.email,
          temp_password: data.temp_password,
          tenant_id: data.tenant_id,
          resort_code: data.resort_code,
          staff_login_url: data.staff_login_url,
          staff_token_url: data.staff_token_url,
          guest_login: data.guest_login || null,
          email_sent: data.email_sent,
          email_error: data.email_error,
          workspace_id: data.workspace_id,
        };
        
        setDemoData(responseData);
        
        if (data.existing) {
          setStep('existing');
          toast.success('Fresh credentials generated');
        } else {
          // Always show email-sent step first for new demos
          setStep('email_sent');
          if (data.email_sent) {
            toast.success('Check your email for login details');
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

  const handleResumeDemo = async () => {
    if (!savedEmail) return;

    setIsSubmitting(true);
    setStep('creating');

    try {
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: savedEmail.trim().toLowerCase(),
          mode: 'resend',
        }
      });

      if (error) throw error;

      if (data?.success) {
        const responseData: DemoCredentials = {
          email: data.email,
          temp_password: data.temp_password,
          tenant_id: data.tenant_id,
          resort_code: data.resort_code,
          staff_login_url: data.staff_login_url,
          staff_token_url: data.staff_token_url,
          guest_login: data.guest_login || null,
          email_sent: data.email_sent,
          workspace_id: data.workspace_id,
        };
        
        setDemoData(responseData);
        setStep('existing');
      } else {
        throw new Error(data?.error || 'Failed to resume demo');
      }
    } catch (error: any) {
      console.error('Resume error:', error);
      toast.error(error.message || 'Failed to resume demo');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateCredentials = async () => {
    if (isRegenerating) return;
    
    setIsRegenerating(true);
    try {
      const creds = await regenerateCredentials();
      if (creds) {
        setDemoData(creds);
        toast.success('New credentials generated');
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReseedData = async () => {
    if (isReseeding) return;
    
    setIsReseeding(true);
    try {
      const success = await reseedData();
      if (success) {
        toast.success('Demo data refreshed');
      } else {
        toast.error('Failed to refresh data');
      }
    } finally {
      setIsReseeding(false);
    }
  };

  const handleStartFresh = () => {
    clearWorkspace();
    setDemoData(null);
    setStep('form');
    setShowCredentials(false);
    setFormData({
      email: '',
      resortName: '',
      timezone: '',
      roomsRange: '',
      departments: [],
    });
  };

  const handleResendEmail = async () => {
    if (isResendingEmail || !demoData?.email) return;
    
    setIsResendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: demoData.email.trim().toLowerCase(),
          mode: 'resend',
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Fresh login link sent to your email!');
        // Update demo data with new credentials
        setDemoData(prev => prev ? {
          ...prev,
          temp_password: data.temp_password,
          staff_token_url: data.staff_token_url,
          guest_login: data.guest_login || prev.guest_login,
          email_sent: data.email_sent,
        } : null);
      } else {
        throw new Error(data?.error || 'Failed to resend email');
      }
    } catch (error: any) {
      if (error.message?.includes('wait')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to resend email. Please try again.');
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isRegenerating && !isReseeding) {
      // Don't reset state on close - allow resume
      onOpenChange(false);
    }
  };

  const goToStaffConsole = () => {
    // Use token URL if available for auto-login
    if (demoData?.staff_token_url) {
      window.open(demoData.staff_token_url, '_blank');
    } else if (demoData?.staff_login_url) {
      try {
        const url = new URL(demoData.staff_login_url);
        handleClose();
        navigate(url.pathname + url.search);
      } catch {
        handleClose();
        navigate(`/staff/auth?username=${encodeURIComponent(demoData?.email || formData.email)}`);
      }
    } else {
      handleClose();
      navigate(`/staff/auth?username=${encodeURIComponent(demoData?.email || formData.email)}`);
    }
  };

  const openGuestPortal = () => {
    // Use token URL if available for auto-login
    if (demoData?.guest_login?.token_url) {
      window.open(demoData.guest_login.token_url, '_blank');
    } else if (demoData?.guest_login?.portal_url) {
      window.open(demoData.guest_login.portal_url, '_blank');
    } else if (demoData?.resort_code) {
      window.open(`/resort/${demoData.resort_code}/guest/login`, '_blank');
    } else {
      window.open('/guest', '_blank');
    }
  };

  const renderCredentialsSection = (isExisting: boolean) => (
    <div className="py-6">
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
        {isExisting ? (
          <Sparkles className="h-8 w-8 text-primary" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-success" />
        )}
      </div>
      <DialogHeader className="text-center mb-6">
        <DialogTitle className="text-2xl">
          {isExisting ? 'Welcome back!' : 'Your demo is ready!'}
        </DialogTitle>
        <DialogDescription>
          {isExisting 
            ? 'Fresh credentials have been generated. Use the new password and PIN below to log in.'
            : 'Open the staff console, then try a booking in the guest portal.'}
        </DialogDescription>
      </DialogHeader>

      {/* Staff Login Credentials */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" />
          <span>Staff Console</span>
        </div>
        <div className="space-y-2 pl-6">
          <CredentialRow label="Email" value={demoData?.email || ''} />
          {demoData?.temp_password && (
            <CredentialRow 
              label="Password" 
              value={demoData.temp_password} 
              isSensitive 
              monospace 
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Tip: Use the one-click button below to avoid typing.
        </p>
      </div>

      {/* Guest Login Credentials */}
      {demoData?.guest_login && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DoorOpen className="h-4 w-4 text-success" />
            <span>Guest Portal</span>
          </div>
          <div className="space-y-2 pl-6">
            <CredentialRow label="Guest" value={demoData.guest_login.guest_name} />
            <CredentialRow label="Room" value={demoData.guest_login.room_number} monospace />
            <CredentialRow label="Last Name" value={demoData.guest_login.last_name} />
            <CredentialRow 
              label="PIN" 
              value={demoData.guest_login.pin} 
              isSensitive 
              monospace 
            />
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

      {/* Recovery Actions */}
      <div className="flex flex-wrap justify-center gap-2 mt-6 pt-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerateCredentials}
          disabled={isRegenerating}
          className="text-muted-foreground hover:text-foreground"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Key className="h-4 w-4 mr-2" />
          )}
          New Credentials
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReseedData}
          disabled={isReseeding}
          className="text-muted-foreground hover:text-foreground"
        >
          {isReseeding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartFresh}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Start Fresh
        </Button>
      </div>

      {demoData?.email_sent && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
          <Mail className="h-4 w-4 text-success" />
          <span>Credentials also sent to {demoData.email}</span>
        </div>
      )}
    </div>
  );

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
                  <TimezoneSelect
                    value={formData.timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                    autoDetect
                  />
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
              {resumeMode ? 'Loading your demo…' : 'Preparing your demo resort…'}
            </h3>
            <p className="text-muted-foreground mb-2">
              {resumeMode 
                ? 'Generating fresh credentials for you.'
                : 'Seeding activities, sessions, guests, and bookings.'}
            </p>
            {!resumeMode && (
              <p className="text-sm text-muted-foreground/70 italic">
                Making it feel like a real Tuesday at a busy resort.
              </p>
            )}
          </div>
        )}

        {step === 'email_sent' && demoData && (
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Inbox className="h-8 w-8 text-success" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Check your email!</DialogTitle>
              <DialogDescription>
                We've sent login links to <strong className="text-foreground">{demoData.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                Click the links in your email to instantly access your demo.
                <br />
                <span className="text-xs">Links expire in 15 minutes.</span>
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full rounded-full font-semibold"
                onClick={handleResendEmail}
                disabled={isResendingEmail}
              >
                {isResendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Resend Email
              </Button>
            </div>

            {/* Didn't get it? Help panel */}
            <Collapsible className="mt-6">
              <CollapsibleTrigger className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full">
                <HelpCircle className="h-4 w-4" />
                Didn't get the email?
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p>• Check your spam/junk folder</p>
                  <p>• Add <span className="font-mono text-xs">noreply@propera.cc</span> to your contacts</p>
                  <p>• Make sure you entered the correct email</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-primary"
                    onClick={handleStartFresh}
                  >
                    Use a different email →
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Secondary: Show credentials option */}
            <Collapsible open={showCredentials} onOpenChange={setShowCredentials} className="mt-4 pt-4 border-t border-border/50">
              <CollapsibleTrigger className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full">
                <Key className="h-4 w-4" />
                {showCredentials ? 'Hide login credentials' : 'Can\'t access email? View credentials'}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {renderCredentialsSection(false)}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {step === 'success' && demoData && renderCredentialsSection(false)}

        {step === 'existing' && demoData && renderCredentialsSection(true)}

        {step === 'rate_limited' && (
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-warning" />
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
                onClick={() => window.open('mailto:hello@propera.io?subject=Demo access request', '_blank')}
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
