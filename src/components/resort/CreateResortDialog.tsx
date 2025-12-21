import { useState, useEffect } from 'react';
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
import { Building2, Check, Copy, AlertTriangle, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebounce } from '@/hooks/useDebounce';

const createResortSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be at most 10 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  adminFullName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Please enter a valid email address'),
  adminUsername: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[a-z0-9._]+$/, 'Username can only contain lowercase letters, numbers, dots, and underscores'),
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
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{
    resortName: string;
    resortCode: string;
    adminEmail: string;
    adminUsername: string;
    emailSent: boolean;
    tempPassword?: string;
    signInLink: string;
  } | null>(null);
  const [copied, setCopied] = useState<'link' | 'password' | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    timezone: 'UTC',
    currency: 'USD',
    adminFullName: '',
    adminEmail: '',
    adminUsername: '',
    notes: '',
  });

  const debouncedUsername = useDebounce(formData.adminUsername, 500);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      // Validate format first
      if (!/^[a-z0-9._]+$/.test(debouncedUsername)) {
        setUsernameAvailable(null);
        return;
      }

      setUsernameChecking(true);
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', debouncedUsername)
          .maybeSingle();

        setUsernameAvailable(existingProfile === null);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    };

    checkUsername();
  }, [debouncedUsername]);

  // Auto-generate username from admin name
  useEffect(() => {
    if (formData.adminFullName && !formData.adminUsername) {
      const suggested = formData.adminFullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '')
        .slice(0, 24);
      if (suggested.length >= 3) {
        setFormData(prev => ({ ...prev, adminUsername: suggested }));
      }
    }
  }, [formData.adminFullName]);

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

    if (!user || !session) return;

    if (usernameAvailable === false) {
      setErrors({ adminUsername: 'Username is already taken' });
      return;
    }

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

      // 2. Bootstrap the Resort Admin via edge function
      const { data: bootstrapResult, error: bootstrapError } = await supabase.functions.invoke(
        'bootstrap-resort-admin',
        {
          body: {
            resortId: resort.id,
            resortName: formData.name.trim(),
            resortCode: formData.code.trim().toUpperCase(),
            adminEmail: formData.adminEmail.trim().toLowerCase(),
            adminUsername: formData.adminUsername.trim().toLowerCase(),
            adminFullName: formData.adminFullName.trim(),
          },
        }
      );

      if (bootstrapError || !bootstrapResult?.success) {
        console.error('Bootstrap error:', bootstrapError || bootstrapResult);
        // Resort was created but admin failed - delete the resort to avoid orphan
        await supabase.from('resorts').delete().eq('id', resort.id);
        toast.error(bootstrapResult?.error || 'Failed to create admin account. Resort creation rolled back.');
        setLoading(false);
        return;
      }
      
      setSuccess({
        resortName: formData.name,
        resortCode: formData.code.toUpperCase(),
        adminEmail: formData.adminEmail,
        adminUsername: bootstrapResult.username,
        emailSent: bootstrapResult.email_sent,
        tempPassword: bootstrapResult.temp_password || undefined,
        signInLink: bootstrapResult.sign_in_link,
      });

      toast.success('Resort and admin account created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating resort:', error);
      toast.error('Failed to create resort');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'link' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type === 'link' ? 'Link' : 'Password'} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      timezone: 'UTC',
      currency: 'USD',
      adminFullName: '',
      adminEmail: '',
      adminUsername: '',
      notes: '',
    });
    setSuccess(null);
    setCopied(null);
    setErrors({});
    setUsernameAvailable(null);
    setShowTempPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Resort
          </DialogTitle>
          <DialogDescription>
            Create a new resort and set up the initial Resort Admin account
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
              <div className="text-sm font-medium text-muted-foreground">Primary Resort Admin</div>
              <p className="text-xs text-muted-foreground">
                This person will receive login credentials via email and have full admin access.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="adminFullName">Full Name *</Label>
                <Input
                  id="adminFullName"
                  value={formData.adminFullName}
                  onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                  placeholder="John Smith"
                />
                {errors.adminFullName && <p className="text-sm text-destructive">{errors.adminFullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@resort.com"
                />
                {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminUsername">Username *</Label>
                <div className="relative">
                  <Input
                    id="adminUsername"
                    value={formData.adminUsername}
                    onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value.toLowerCase() })}
                    placeholder="john.smith"
                    className={usernameAvailable === false ? 'border-destructive pr-10' : usernameAvailable === true ? 'border-success pr-10' : 'pr-10'}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!usernameChecking && usernameAvailable === true && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {!usernameChecking && usernameAvailable === false && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">3-24 chars: lowercase letters, numbers, dots, underscores</p>
                {errors.adminUsername && <p className="text-sm text-destructive">{errors.adminUsername}</p>}
                {usernameAvailable === false && !errors.adminUsername && (
                  <p className="text-sm text-destructive">Username is already taken</p>
                )}
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
              <Button type="submit" disabled={loading || usernameChecking || usernameAvailable === false}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Resort & Admin'
                )}
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

            {/* Email status */}
            {success.emailSent ? (
              <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Welcome Email Sent</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Login credentials have been emailed to <strong>{success.adminEmail}</strong>.
                  They will be prompted to set a new password on first login.
                </p>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <p className="font-medium">Email failed to send</p>
                  <p className="text-sm">
                    Please share these credentials with the admin manually.
                    <strong className="block mt-1">Copy now — you won't be able to view this password again.</strong>
                  </p>
                  
                  <div className="space-y-2 p-3 bg-background/50 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Username:</span>
                      <code className="text-sm font-mono">{success.adminUsername}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Temporary Password:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">
                          {showTempPassword ? success.tempPassword : '••••••••••••'}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                        >
                          {showTempPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        {success.tempPassword && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(success.tempPassword!, 'password')}
                          >
                            {copied === 'password' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Sign in link */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium">Staff Console Sign-in Link</div>
              <div className="flex gap-2">
                <Input 
                  value={success.signInLink} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(success.signInLink, 'link')}
                >
                  {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Username will be pre-filled. Temporary password expires in 7 days.
              </p>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p className="font-medium text-primary">Next Steps:</p>
              <ol className="list-decimal list-inside mt-1 text-muted-foreground space-y-1">
                <li>Resort Admin signs in with credentials</li>
                <li>Sets a new permanent password on first login</li>
                <li>Guided through resort setup (branding, activities, restaurants)</li>
                <li>Can invite their own staff members</li>
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
