import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Sparkles, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface DemoSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demoData: {
    tenant_id: string;
    resort_code: string;
    email: string;
    temp_password?: string;
    email_sent: boolean;
    existing_user?: boolean;
  } | null;
}

export function DemoSuccessDialog({ open, onOpenChange, demoData }: DemoSuccessDialogProps) {
  const navigate = useNavigate();
  const [copiedPassword, setCopiedPassword] = useState(false);

  const copyPassword = async () => {
    if (demoData?.temp_password) {
      await navigator.clipboard.writeText(demoData.temp_password);
      setCopiedPassword(true);
      toast.success('Password copied!');
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const goToLogin = () => {
    onOpenChange(false);
    navigate(`/auth?email=${encodeURIComponent(demoData?.email || '')}`);
  };

  if (!demoData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-2xl">Your demo is ready!</DialogTitle>
          <DialogDescription>
            {demoData.existing_user 
              ? 'Your demo resort has been created. Sign in with your existing account.'
              : 'We\'ve set up your demo resort with sample data to explore.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email notification */}
          {demoData.email_sent && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm">
                Login credentials sent to <strong>{demoData.email}</strong>
              </p>
            </div>
          )}

          {/* Credentials */}
          {demoData.temp_password && !demoData.existing_user && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Email</label>
                <Input value={demoData.email} readOnly className="bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Temporary Password</label>
                <div className="relative">
                  <Input 
                    value={demoData.temp_password} 
                    readOnly 
                    className="bg-background pr-12 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={copyPassword}
                  >
                    {copiedPassword ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* What's included */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Your demo includes:</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              <li>Sample activities, sessions & restaurants</li>
              <li>Pre-loaded guest profiles</li>
              <li>Working guest portal to test bookings</li>
              <li>14-day access period</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={goToLogin} className="w-full">
            Sign In to Your Demo
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            I'll sign in later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
