import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { getStaffInviteUrl } from '@/lib/url-utils';
import { ResortRole } from '@/types/database';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Check, Mail, UserPlus, AlertCircle, Loader2, AtSign, Calendar, Shield } from 'lucide-react';
import { z } from 'zod';
import { useDebounce } from '@/hooks/useDebounce';

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  RESERVATIONS: 'Reservations',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be at most 24 characters')
  .regex(/^[a-z0-9._]+$/, 'Only lowercase letters, numbers, dots and underscores');

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
  username: usernameSchema,
  resort_role: z.enum(['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS', 'ACTIVITIES', 'FNB']),
  department: z.string().optional(),
  invite_message: z.string().max(500, 'Message must be under 500 characters').optional(),
});

interface StaffInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StaffInviteDialog({ open, onOpenChange, onSuccess }: StaffInviteDialogProps) {
  const { user, profile } = useAuth();
  const { currentResort } = useResort();
  const { getAvailableRoles, canInviteStaff } = useStaffPermissions();
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    username: '',
    resort_role: '' as ResortRole | '',
    department: '',
    invite_message: '',
  });

  const debouncedUsername = useDebounce(formData.username, 400);

  // Get available roles for the current user (exclude SUPER_ADMIN for invite flow)
  const availableRoles = getAvailableRoles(false) as ResortRole[];

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!currentResort || !debouncedUsername || debouncedUsername.length < 3) {
        setUsernameStatus('idle');
        setUsernameSuggestion(null);
        return;
      }

      // Validate format first
      const formatResult = usernameSchema.safeParse(debouncedUsername);
      if (!formatResult.success) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');
      try {
        // Use type assertion since function was just added
        const { data, error } = await (supabase.rpc as any)('check_username_available', {
          p_resort_id: currentResort.id,
          p_username: debouncedUsername,
        });

        if (error) throw error;

        const result = data as { available: boolean; suggestion?: string };
        if (result.available) {
          setUsernameStatus('available');
          setUsernameSuggestion(null);
        } else {
          setUsernameStatus('taken');
          setUsernameSuggestion(result.suggestion || null);
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    };

    checkUsername();
  }, [debouncedUsername, currentResort]);

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleUsernameChange = (value: string) => {
    // Normalize: lowercase, no spaces
    const normalized = value.toLowerCase().replace(/\s/g, '');
    setFormData(prev => ({ ...prev, username: normalized }));
  };

  const applySuggestion = () => {
    if (usernameSuggestion) {
      setFormData(prev => ({ ...prev, username: usernameSuggestion }));
    }
  };

  const handleSubmit = async () => {
    if (!currentResort || !user) return;

    // Check if user can invite with selected role
    if (formData.resort_role && !canInviteStaff(currentResort.id, formData.resort_role)) {
      toast.error('You do not have permission to assign this role');
      return;
    }

    // Check username availability
    if (usernameStatus !== 'available') {
      toast.error('Please choose an available username');
      return;
    }

    setErrors({});
    const result = inviteSchema.safeParse(formData);
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

    setSaving(true);
    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Get inviter's name for the email
      const inviterName = profile?.full_name || user.email?.split('@')[0] || 'Your administrator';

      const { data: invitation, error } = await supabase
        .from('staff_invitations')
        .insert({
          email: formData.email.trim().toLowerCase(),
          name: formData.name.trim() || null,
          username: formData.username.trim().toLowerCase(),
          resort_id: currentResort.id,
          resort_role: formData.resort_role as ResortRole,
          department: formData.department.trim() || null,
          invited_by_user_id: user.id,
          invited_by_name: inviterName,
          invite_message: formData.invite_message.trim() || null,
          token,
          status: 'PENDING',
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      const link = getStaffInviteUrl(token);
      setInviteLink(link);

      // Log the invite creation
      await supabase.rpc('log_staff_action', {
        p_action: 'invite_created',
        p_resort_id: currentResort.id,
        p_target_user_id: null,
        p_metadata: {
          email: formData.email.trim().toLowerCase(),
          username: formData.username.trim().toLowerCase(),
          role: formData.resort_role,
          invitation_id: invitation?.id
        }
      });

      // Send invitation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-staff-invite', {
          body: {
            email: formData.email.trim().toLowerCase(),
            name: formData.name.trim() || null,
            username: formData.username.trim().toLowerCase(),
            resortName: currentResort.name,
            resortId: currentResort.id,
            role: formData.resort_role,
            inviteLink: link,
            expiresIn: '7 days',
            expiresAt: expiresAt.toISOString(),
            invitationId: invitation?.id,
            inviterName,
            inviteMessage: formData.invite_message.trim() || null,
          },
        });

        if (emailError) {
          console.error('Failed to send email:', emailError);
          toast.success('Invitation created! Email could not be sent - please share the link manually.');
        } else {
          toast.success('Invitation sent successfully!');
        }
      } catch (emailErr) {
        console.error('Email sending error:', emailErr);
        toast.success('Invitation created! Email could not be sent - please share the link manually.');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error('Failed to create invitation');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setFormData({ email: '', name: '', username: '', resort_role: '', department: '', invite_message: '' });
    setInviteLink(null);
    setCopied(false);
    setErrors({});
    setUsernameStatus('idle');
    setUsernameSuggestion(null);
    onOpenChange(false);
  };

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join {currentResort?.name}
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <>
            <div className="space-y-4 py-4" role="form">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@example.com"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5" />
                  Username *
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="john.smith"
                    className={`pr-10 ${
                      usernameStatus === 'available' ? 'border-success focus-visible:ring-success/20' :
                      usernameStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive/20' : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {usernameStatus === 'available' && (
                      <Check className="h-4 w-4 text-success" />
                    )}
                    {usernameStatus === 'taken' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  3-24 chars, lowercase letters, numbers, dots or underscores
                </p>
                {usernameStatus === 'taken' && usernameSuggestion && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-destructive">Username taken.</span>
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="text-primary hover:underline font-medium"
                    >
                      Use {usernameSuggestion}?
                    </button>
                  </div>
                )}
                {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select 
                    value={formData.resort_role} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, resort_role: value as ResortRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.resort_role && <p className="text-sm text-destructive">{errors.resort_role}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Dive Center"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_message">Personal Note (optional)</Label>
                <Textarea
                  id="invite_message"
                  value={formData.invite_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, invite_message: e.target.value }))}
                  placeholder="Welcome to the team! Looking forward to working with you..."
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This note will be included in the invitation email
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.email || !formData.username || !formData.resort_role || saving || usernameStatus !== 'available'}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-5 py-4">
            <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
              <Mail className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="font-medium text-success">Invitation Sent!</p>
                <p className="text-sm text-muted-foreground">
                  {formData.name || formData.email} will receive their invite shortly
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="secondary">{ROLE_LABELS[formData.resort_role as ResortRole]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Username</span>
                <span className="font-mono text-sm">@{formData.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Expires
                </span>
                <span className="text-sm">{expiryDate.toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
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
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
