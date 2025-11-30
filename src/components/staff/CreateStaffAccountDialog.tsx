import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { z } from 'zod';

const ALL_RESORT_ROLES: ResortRole[] = ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'];

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

const createAccountSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  resort_role: z.enum(['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB']),
  department: z.string().optional(),
});

interface CreateStaffAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateStaffAccountDialog({ open, onOpenChange, onSuccess }: CreateStaffAccountDialogProps) {
  const { currentResort } = useResort();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    resort_role: '' as ResortRole | '',
    department: '',
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = async () => {
    if (!currentResort) return;

    setErrors({});
    const result = createAccountSchema.safeParse(formData);
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
      const { data, error } = await supabase.rpc('create_staff_account', {
        p_username: formData.username.trim(),
        p_password: formData.password,
        p_full_name: formData.full_name.trim() || null,
        p_email: formData.email.trim() || null,
        p_resort_id: currentResort.id,
        p_resort_role: formData.resort_role as ResortRole,
        p_department: formData.department.trim() || null,
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string; username?: string };
      if (!response.success) {
        toast.error(response.error || 'Failed to create account');
        return;
      }

      setCreatedCredentials({
        username: formData.username.trim(),
        password: formData.password,
      });
      toast.success('Staff account created successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating staff account:', error);
      toast.error('Failed to create staff account');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `Username: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      resort_role: '',
      department: '',
    });
    setCreatedCredentials(null);
    setCopied(false);
    setErrors({});
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Staff Account
          </DialogTitle>
          <DialogDescription>
            Create a new staff account for {currentResort?.name}. They can log in immediately.
          </DialogDescription>
        </DialogHeader>

        {!createdCredentials ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="john_smith"
                />
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and underscores only. This is what they'll use to log in.
                </p>
                {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. If provided, they can also log in with their email.
                </p>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
                disabled={!formData.username || !formData.password || !formData.resort_role || saving}
              >
                {saving ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
              <UserPlus className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-success">Account Created!</p>
                <p className="text-sm text-muted-foreground">
                  Share these credentials securely with the staff member.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
              <div>
                <Label className="text-xs text-muted-foreground">Username</Label>
                <p className="font-mono font-medium">{createdCredentials.username}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Password</Label>
                <p className="font-mono font-medium">{createdCredentials.password}</p>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={copyCredentials}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Credentials'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              They can log in at the staff login page using their username and password.
            </p>

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