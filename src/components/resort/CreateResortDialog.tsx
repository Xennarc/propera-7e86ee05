import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';
import { z } from 'zod';
import { Building2, Check, Copy, Mail } from 'lucide-react';
import { ResortRole } from '@/types/database';

const createResortSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be at most 10 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Please enter a valid email address'),
});

const timezones = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Honolulu',
  'Indian/Maldives',
];

const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'AED', 'MVR', 'THB', 'JPY'];

interface CreateResortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateResortDialog({ open, onOpenChange, onSuccess }: CreateResortDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{
    resortName: string;
    resortCode: string;
    adminEmail: string;
    inviteLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    timezone: 'UTC',
    currency: 'USD',
    adminName: '',
    adminEmail: '',
    notes: '',
  });

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = createResortSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      // 1. Create the resort
      const { data: resort, error: resortError } = await supabase
        .from('resorts')
        .insert({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          timezone: formData.timezone,
          currency: formData.currency,
          status: 'ACTIVE',
          is_demo: false,
          onboarding_status: 'NOT_STARTED',
          onboarding_basics_done: false,
          onboarding_activities_done: false,
          onboarding_restaurants_done: false,
          onboarding_staff_done: false,
          onboarding_portal_done: false,
        })
        .select()
        .single();

      if (resortError) {
        if (resortError.message.includes('duplicate')) {
          toast.error('A resort with this code already exists');
        } else {
          toast.error(resortError.message);
        }
        setLoading(false);
        return;
      }

      // 2. Create staff invitation for the Resort Admin
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for initial admin

      const { error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          email: formData.adminEmail.trim().toLowerCase(),
          name: formData.adminName.trim(),
          resort_id: resort.id,
          resort_role: 'RESORT_ADMIN' as ResortRole,
          department: 'Management',
          invited_by_user_id: user.id,
          token,
          status: 'PENDING',
          expires_at: expiresAt.toISOString(),
        });

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        // Resort was created, but invitation failed - still show partial success
        toast.warning('Resort created, but invitation failed. You can manually invite the admin.');
      }

      const inviteLink = `${window.location.origin}/staff/invite/${token}`;
      
      setSuccess({
        resortName: formData.name,
        resortCode: formData.code.toUpperCase(),
        adminEmail: formData.adminEmail,
        inviteLink,
      });

      toast.success('Resort created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating resort:', error);
      toast.error('Failed to create resort');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!success?.inviteLink) return;
    await navigator.clipboard.writeText(success.inviteLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      timezone: 'UTC',
      currency: 'USD',
      adminName: '',
      adminEmail: '',
      notes: '',
    });
    setSuccess(null);
    setCopied(false);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Resort
          </DialogTitle>
          <DialogDescription>
            Create a new resort and set up the initial Resort Admin
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Resort Details</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Resort Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Paradise Island Resort"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Resort Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PIR"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">Short unique code for URLs</p>
                  {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone *</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.timezone && <p className="text-sm text-destructive">{errors.timezone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((curr) => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currency && <p className="text-sm text-destructive">{errors.currency}</p>}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Initial Resort Admin</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name *</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="John Smith"
                  />
                  {errors.adminName && <p className="text-sm text-destructive">{errors.adminName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@resort.com"
                  />
                  {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g., Contract signed Feb 2025"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Resort'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
              <Check className="h-6 w-6 text-success" />
              <div>
                <p className="font-semibold text-success">Resort Created Successfully!</p>
                <p className="text-sm text-muted-foreground">
                  {success.resortName} ({success.resortCode}) is ready
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Resort Admin Invitation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this link with <strong>{success.adminEmail}</strong> so they can set up their account and start managing the resort.
              </p>
              <div className="flex gap-2">
                <Input 
                  value={success.inviteLink} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyLink}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This invitation expires in 30 days
              </p>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p className="font-medium text-primary">Next Steps:</p>
              <ol className="list-decimal list-inside mt-1 text-muted-foreground space-y-1">
                <li>Send the invitation link to the Resort Admin</li>
                <li>They'll create an account and sign in</li>
                <li>On first login, they'll be guided through branding setup</li>
                <li>They can then invite their own staff members</li>
              </ol>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
