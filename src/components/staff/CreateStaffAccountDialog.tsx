import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { ResortRole } from '@/types/database';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
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
import { SuperAdminConfirmDialog } from './SuperAdminConfirmDialog';
import { toast } from 'sonner';
import { UserPlus, Eye, EyeOff, Copy, Check, Shield } from 'lucide-react';
import { z } from 'zod';

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  RESERVATIONS: 'Reservations',
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
  resort_role: z.enum(['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS', 'ACTIVITIES', 'FNB']).optional(),
  department: z.string().optional(),
});

interface CreateStaffAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  // Optional: allow creating SUPER_ADMIN (only shown to SUPER_ADMIN users)
  allowSuperAdmin?: boolean;
}

export function CreateStaffAccountDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  allowSuperAdmin = false 
}: CreateStaffAccountDialogProps) {
  const { currentResort } = useResort();
  const { isSuperAdmin, canCreateSuperAdmin, getAvailableRoles, canInviteStaff } = useStaffPermissions();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuperAdminConfirm, setShowSuperAdminConfirm] = useState(false);
  const [createAsSuperAdmin, setCreateAsSuperAdmin] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    resort_role: '' as ResortRole | '',
    department: '',
  });

  // Get available roles - include SUPER_ADMIN if allowed and user has permission
  const showSuperAdminOption = allowSuperAdmin && canCreateSuperAdmin();
  const availableRoles = getAvailableRoles(false) as ResortRole[];

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = async () => {
    // If creating as SUPER_ADMIN, show confirmation first
    if (createAsSuperAdmin) {
      setShowSuperAdminConfirm(true);
      return;
    }

    await performCreate();
  };

  const performCreate = async () => {
    if (!currentResort && !createAsSuperAdmin) return;

    // Validate permissions
    if (!createAsSuperAdmin && formData.resort_role && currentResort) {
      if (!canInviteStaff(currentResort.id, formData.resort_role)) {
        toast.error('You do not have permission to create staff with this role');
        return;
      }
    }

    setErrors({});
    
    // For SUPER_ADMIN, we don't require resort_role
    const schemaToUse = createAsSuperAdmin 
      ? createAccountSchema.omit({ resort_role: true })
      : createAccountSchema;
    
    const result = schemaToUse.safeParse(formData);
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

    if (!createAsSuperAdmin && !formData.resort_role) {
      setErrors({ resort_role: 'Please select a role' });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: {
          username: formData.username.trim(),
          password: formData.password,
          full_name: formData.full_name.trim() || null,
          email: formData.email.trim() || null,
          resort_id: createAsSuperAdmin ? null : currentResort?.id,
          resort_role: createAsSuperAdmin ? null : (formData.resort_role as ResortRole),
          department: formData.department.trim() || null,
          set_super_admin: createAsSuperAdmin,
        }
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to create account');
        return;
      }

      setCreatedCredentials({
        username: formData.username.trim(),
        password: formData.password,
      });
      
      const successMessage = createAsSuperAdmin 
        ? 'Super Admin account created successfully'
        : 'Staff account created successfully';
      toast.success(successMessage);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating staff account:', error);
      toast.error('Failed to create staff account');
    } finally {
      setSaving(false);
      setShowSuperAdminConfirm(false);
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
    setCreateAsSuperAdmin(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {createAsSuperAdmin ? 'Create Super Admin' : 'Create Staff Account'}
            </DialogTitle>
            <DialogDescription>
              {createAsSuperAdmin 
                ? 'Create a new Super Admin with global platform access'
                : `Create a new staff account for ${currentResort?.name}. They can log in immediately.`
              }
            </DialogDescription>
          </DialogHeader>

          {!createdCredentials ? (
            <>
              <div className="space-y-4 py-4" role="form">
                {/* Super Admin toggle (only for allowed users) */}
                {showSuperAdminOption && (
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      createAsSuperAdmin 
                        ? 'bg-destructive/10 border-destructive/30' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setCreateAsSuperAdmin(!createAsSuperAdmin)}
                  >
                    <Shield className={`h-5 w-5 ${createAsSuperAdmin ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Create as Super Admin</p>
                      <p className="text-xs text-muted-foreground">
                        Grants global access to all resorts
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded border ${
                      createAsSuperAdmin 
                        ? 'bg-destructive border-destructive' 
                        : 'border-muted-foreground'
                    }`}>
                      {createAsSuperAdmin && (
                        <Check className="h-4 w-4 text-destructive-foreground" />
                      )}
                    </div>
                  </div>
                )}

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

                {/* Only show role selection for non-SUPER_ADMIN accounts */}
                {!createAsSuperAdmin && (
                  <>
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
                      <Label htmlFor="department">Department (optional)</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="e.g., Dive Center, Reception"
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={
                    !formData.username || 
                    !formData.password || 
                    (!createAsSuperAdmin && !formData.resort_role) || 
                    saving
                  }
                  variant={createAsSuperAdmin ? 'destructive' : 'default'}
                >
                  {saving ? 'Creating...' : createAsSuperAdmin ? 'Create Super Admin' : 'Create Account'}
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

      {/* Super Admin Confirmation Dialog */}
      <SuperAdminConfirmDialog
        open={showSuperAdminConfirm}
        onOpenChange={setShowSuperAdminConfirm}
        onConfirm={performCreate}
        actionType="create"
        targetName={formData.full_name || formData.username}
      />
    </>
  );
}
