import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStaffInviteUrl, getGuestPortalUrl } from '@/lib/url-utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, ExternalLink, CheckCircle, Sparkles } from 'lucide-react';
import { seedDemoResortData } from '@/lib/demo-seed';

interface DemoResortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type DemoDuration = '7' | '14' | '30';

export function DemoResortDialog({ open, onOpenChange, onSuccess }: DemoResortDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({
    prospectName: '',
    prospectEmail: '',
    duration: '14' as DemoDuration,
    note: '',
  });
  const [result, setResult] = useState<{
    resortName: string;
    resortCode: string;
    staffInviteUrl: string;
    guestPortalUrl: string;
  } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const generateResortCode = (name: string): string => {
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `DEMO-${slug || 'RES'}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prospectName.trim() || !formData.prospectEmail.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and email are required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.prospectEmail)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);

    try {
      const resortCode = generateResortCode(formData.prospectName);
      const resortName = `Demo – ${formData.prospectName.trim()}`;
      const durationDays = parseInt(formData.duration);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Create the demo resort
      const { data: resort, error: resortError } = await supabase
        .from('resorts')
        .insert({
          name: resortName,
          code: resortCode,
          status: 'DEMO',
          is_demo: true,
          demo_expires_at: expiresAt.toISOString(),
          demo_note: formData.note.trim() || null,
          timezone: 'UTC',
          currency: 'USD',
          onboarding_status: 'COMPLETED',
          onboarding_basics_done: true,
          onboarding_activities_done: true,
          onboarding_restaurants_done: true,
          onboarding_staff_done: true,
          onboarding_portal_done: true,
        })
        .select()
        .single();

      if (resortError) throw resortError;

      // Seed demo data
      await seedDemoResortData(resort.id);

      // Create staff invitation
      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + durationDays);

      const { error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          email: formData.prospectEmail.trim().toLowerCase(),
          name: formData.prospectName.trim(),
          resort_id: resort.id,
          resort_role: 'RESORT_ADMIN',
          department: 'Management',
          invited_by_user_id: user?.id,
          token: inviteToken,
          status: 'PENDING',
          expires_at: inviteExpiresAt.toISOString(),
        });

      if (inviteError) throw inviteError;

      setResult({
        resortName,
        resortCode,
        staffInviteUrl: getStaffInviteUrl(inviteToken),
        guestPortalUrl: getGuestPortalUrl(resortCode),
      });
      setStep('success');
      onSuccess();

    } catch (error: any) {
      console.error('Error creating demo resort:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error creating demo', 
        description: error.message || 'Failed to create demo resort' 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  const handleClose = () => {
    setStep('form');
    setFormData({ prospectName: '', prospectEmail: '', duration: '14', note: '' });
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create Demo Resort
              </DialogTitle>
              <DialogDescription>
                Set up a sandbox environment with sample data for a prospect to explore Propera.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prospectName">Prospect / Resort Name *</Label>
                <Input
                  id="prospectName"
                  value={formData.prospectName}
                  onChange={(e) => setFormData({ ...formData, prospectName: e.target.value })}
                  placeholder="Ocean Pearl Resort"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prospectEmail">Prospect Email *</Label>
                <Input
                  id="prospectEmail"
                  type="email"
                  value={formData.prospectEmail}
                  onChange={(e) => setFormData({ ...formData, prospectEmail: e.target.value })}
                  placeholder="prospect@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  They'll receive a staff invite as Resort Admin
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Demo Duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData({ ...formData, duration: value as DemoDuration })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Internal Note (optional)</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Lead from trade show, interested in diving activities..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Demo Resort'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                Demo Created Successfully
              </DialogTitle>
              <DialogDescription>
                Share these links with your prospect to get them started.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">{result?.resortName}</p>
                <p className="text-xs text-muted-foreground font-mono">{result?.resortCode}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Staff Invite Link</Label>
                  <div className="flex gap-2">
                    <Input value={result?.staffInviteUrl || ''} readOnly className="font-mono text-xs" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(result?.staffInviteUrl || '', 'Staff invite link')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send this to the prospect so they can log in as Resort Admin
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Guest Portal Link</Label>
                  <div className="flex gap-2">
                    <Input value={result?.guestPortalUrl || ''} readOnly className="font-mono text-xs" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(result?.guestPortalUrl || '', 'Guest portal link')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      asChild
                    >
                      <a href={result?.guestPortalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this to demonstrate the guest experience
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}