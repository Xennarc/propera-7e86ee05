import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Check, Mail, UserPlus } from 'lucide-react';
import { z } from 'zod';

const ALL_RESORT_ROLES: ResortRole[] = ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'];

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
  resort_role: z.enum(['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB']),
  department: z.string().optional(),
});

interface StaffInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StaffInviteDialog({ open, onOpenChange, onSuccess }: StaffInviteDialogProps) {
  const { user } = useAuth();
  const { currentResort } = useResort();
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    resort_role: '' as ResortRole | '',
    department: '',
  });

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleSubmit = async () => {
    if (!currentResort || !user) return;

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

      const { error } = await supabase
        .from('staff_invitations')
        .insert({
          email: formData.email.trim().toLowerCase(),
          name: formData.name.trim() || null,
          resort_id: currentResort.id,
          resort_role: formData.resort_role as ResortRole,
          department: formData.department.trim() || null,
          invited_by_user_id: user.id,
          token,
          status: 'PENDING',
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      const link = `${window.location.origin}/staff/invite/${token}`;
      setInviteLink(link);

      // Send invitation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-staff-invite', {
          body: {
            email: formData.email.trim().toLowerCase(),
            name: formData.name.trim() || null,
            resortName: currentResort.name,
            resortId: currentResort.id,
            role: formData.resort_role,
            inviteLink: link,
            expiresIn: '7 days',
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
    setFormData({ email: '', name: '', resort_role: '', department: '' });
    setInviteLink(null);
    setCopied(false);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
            <div className="space-y-4 py-4">
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

              <div className="space-y-2">
                <Label htmlFor="name">Full Name (optional)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Smith"
                />
              </div>

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
                    {ALL_RESORT_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.resort_role && <p className="text-sm text-destructive">{errors.resort_role}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department (optional)</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., Dive Center, Reception"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.email || !formData.resort_role || saving}
              >
                {saving ? 'Creating...' : 'Create Invitation'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
              <Mail className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-success">Invitation Created!</p>
                <p className="text-sm text-muted-foreground">
                  Share this link with {formData.name || formData.email}
                </p>
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
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days
              </p>
            </div>

            <DialogFooter className="pt-4">
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