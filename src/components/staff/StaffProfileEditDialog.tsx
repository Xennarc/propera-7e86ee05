import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ResortRole, Profile } from '@/types/database';
import { Loader2, User, Mail, Building, Shield, Briefcase } from 'lucide-react';

const ALL_RESORT_ROLES: ResortRole[] = ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS', 'ACTIVITIES', 'FNB'];

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  RESERVATIONS: 'Reservations',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

interface StaffProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  membershipId: string;
  currentRole: ResortRole;
  currentDepartment: string | null;
  onSuccess: () => void;
}

interface ProfileData {
  full_name: string;
  username: string | null;
  email: string | null;
}

export function StaffProfileEditDialog({
  open,
  onOpenChange,
  userId,
  membershipId,
  currentRole,
  currentDepartment,
  onSuccess,
}: StaffProfileEditDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    username: null,
    email: null,
  });
  const [membershipData, setMembershipData] = useState({
    resort_role: currentRole,
    department: currentDepartment || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && userId) {
      fetchProfileData();
    }
  }, [open, userId]);

  useEffect(() => {
    setMembershipData({
      resort_role: currentRole,
      department: currentDepartment || '',
    });
  }, [currentRole, currentDepartment]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get email from staff_lookup_by_identifier function (uses service role internally)
      const { data: lookupData, error: lookupError } = await supabase
        .rpc('staff_lookup_by_identifier', { p_identifier: profile?.username || userId });

      const email = lookupData?.[0]?.email || null;

      setProfileData({
        full_name: profile?.full_name || '',
        username: profile?.username || null,
        email: email,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profileData.full_name.trim() || profileData.full_name.trim().length < 2) {
      newErrors.full_name = 'Name must be at least 2 characters';
    }

    if (profileData.username && profileData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (profileData.username && !/^[a-zA-Z0-9_]+$/.test(profileData.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setErrors({});

    try {
      // Update profile (full_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name.trim(),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update username if changed (using RPC function for validation)
      if (profileData.username) {
        const { data: usernameResult, error: usernameError } = await supabase
          .rpc('update_staff_username', {
            p_user_id: userId,
            p_new_username: profileData.username.trim(),
          });

        if (usernameError) throw usernameError;
        
        const result = usernameResult as { success: boolean; error?: string };
        if (!result.success) {
          setErrors({ username: result.error || 'Failed to update username' });
          setSaving(false);
          return;
        }
      }

      // Update membership (role and department)
      const { error: membershipError } = await supabase
        .from('resort_memberships')
        .update({
          resort_role: membershipData.resort_role,
          department: membershipData.department || null,
        })
        .eq('id', membershipId);

      if (membershipError) throw membershipError;

      toast.success('Staff profile updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Staff Profile
          </DialogTitle>
          <DialogDescription>
            Update staff member's profile information, role, and department
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Profile Information Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Information
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profileData.full_name}
                  onChange={(e) => {
                    setProfileData(prev => ({ ...prev, full_name: e.target.value }));
                    if (errors.full_name) setErrors(prev => ({ ...prev, full_name: '' }));
                  }}
                  placeholder="Enter full name"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profileData.username || ''}
                  onChange={(e) => {
                    setProfileData(prev => ({ ...prev, username: e.target.value }));
                    if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                  }}
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={profileData.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Use "Reset Password" for login updates.
                </p>
              </div>
            </div>

            {/* Role & Access Section */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role & Access
              </h4>

              <div className="space-y-2">
                <Label>Resort Role *</Label>
                <Select
                  value={membershipData.resort_role}
                  onValueChange={(value) => setMembershipData(prev => ({ ...prev, resort_role: value as ResortRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_RESORT_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Department
                </Label>
                <Input
                  id="department"
                  value={membershipData.department}
                  onChange={(e) => setMembershipData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., Dive Center, Reception, Spa"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
