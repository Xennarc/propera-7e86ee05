import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, CheckCircle2, ExternalLink, Mail, RotateCw, AlertTriangle, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEMO_RESORT_CODE } from '@/lib/demoSingleton';

interface DemoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeMode?: boolean;
}

const DEMO_EMAIL_KEY = 'propera_demo_email';

interface SingletonDemoResponse {
  success: boolean;
  staffUrl: string;
  guestUrl: string;
  leadId: string | null;
  resortCode: string;
  resortName: string;
  resortId: string;
  emailSent: boolean;
  emailError: string | null;
}

export function DemoWizard({ open, onOpenChange, resumeMode = false }: DemoWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [step, setStep] = useState<'form' | 'creating' | 'ready' | 'rate_limited'>('form');
  const [demoData, setDemoData] = useState<SingletonDemoResponse | null>(null);
  const [email, setEmail] = useState('');
  
  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(DEMO_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  // Auto-trigger resume mode if we have saved email
  useEffect(() => {
    if (resumeMode && open && email) {
      handleSubmit();
    }
  }, [resumeMode, open]);

  const isFormValid = () => {
    return email.includes('@') && email.includes('.');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    setStep('creating');

    try {
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: email.trim().toLowerCase(),
          mode: 'start-demo-singleton',
          utm: {
            source: new URLSearchParams(window.location.search).get('utm_source'),
            medium: new URLSearchParams(window.location.search).get('utm_medium'),
            campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
          },
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Save email for resume
        localStorage.setItem(DEMO_EMAIL_KEY, email.trim().toLowerCase());
        
        setDemoData(data as SingletonDemoResponse);
        setStep('ready');
        
        if (data.emailSent) {
          toast.success('Demo links sent to your email!');
        }
      } else if (data?.error?.includes('Rate limit')) {
        setStep('rate_limited');
      } else {
        throw new Error(data?.error || 'Failed to start demo');
      }
    } catch (error: any) {
      console.error('Demo start error:', error);
      toast.error(error.message || 'Failed to start demo. Please try again.');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendLinks = async () => {
    if (isResending || !email) return;
    
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-demo', {
        body: {
          email: email.trim().toLowerCase(),
          mode: 'start-demo-singleton',
        }
      });

      if (error) throw error;

      if (data?.success) {
        setDemoData(data as SingletonDemoResponse);
        if (data.emailSent) {
          toast.success('Fresh links sent to your email!');
        } else if (data.emailError) {
          toast.info(data.emailError);
        }
      } else {
        throw new Error(data?.error || 'Failed to resend');
      }
    } catch (error: any) {
      if (error.message?.includes('wait')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to resend. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleStartFresh = () => {
    localStorage.removeItem(DEMO_EMAIL_KEY);
    setDemoData(null);
    setStep('form');
    setEmail('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const openStaffConsole = () => {
    if (demoData?.staffUrl) {
      window.open(demoData.staffUrl, '_blank');
    }
  };

  const openGuestPortal = () => {
    if (demoData?.guestUrl) {
      window.open(demoData.guestUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Try Propera instantly</DialogTitle>
              <DialogDescription>
                Enter your email to get instant access to our demo resort.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@resort.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We'll also email you the access links.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-full font-semibold" 
                size="lg"
                disabled={!isFormValid() || isSubmitting}
              >
                Start Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                No credit card required. No spam.
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
              Getting your demo ready…
            </h3>
            <p className="text-muted-foreground">
              Just a moment.
            </p>
          </div>
        )}

        {step === 'ready' && demoData && (
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Your demo is ready!</DialogTitle>
              <DialogDescription>
                Explore {demoData.resortName} right now.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full rounded-full font-semibold"
                onClick={openStaffConsole}
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

            {demoData.emailSent && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
                <Mail className="h-4 w-4 text-success" />
                <span>Links also sent to {email}</span>
              </div>
            )}

            <div className="text-center mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-3">
                Staff console is read-only in demo mode.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendLinks}
                  disabled={isResending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Email Links Again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartFresh}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Different Email
                </Button>
              </div>
            </div>

            {/* Help section */}
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full">
                <HelpCircle className="h-4 w-4" />
                Didn't get the email?
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p>• Check your spam/junk folder</p>
                  <p>• Add <span className="font-mono text-xs">noreply@propera.cc</span> to your contacts</p>
                  <p>• The buttons above work instantly - no email needed!</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {step === 'rate_limited' && (
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Too many requests</DialogTitle>
              <DialogDescription>
                Please wait a moment before trying again, or contact us for immediate access.
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
