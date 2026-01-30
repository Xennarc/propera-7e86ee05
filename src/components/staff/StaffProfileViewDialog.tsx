import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResortRole } from '@/types/database';
import { Loader2, User, Mail, Building, Shield, Briefcase, AtSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  RESERVATIONS: 'Reservations',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
  TRANSPORT: 'Transport',
};

const ROLE_COLORS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  FRONT_OFFICE: 'bg-success/10 text-success border-success/20',
  RESERVATIONS: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ACTIVITIES: 'bg-warning/10 text-warning border-warning/20',
  FNB: 'bg-info/10 text-info border-info/20',
  TRANSPORT: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

interface StaffProfileViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  resortRole: ResortRole;
  department: string | null;
  memberSince: string;
  onEdit: () => void;
}

interface ProfileData {
  full_name: string;
  username: string | null;
  email: string | null;
}

export function StaffProfileViewDialog({
  open,
  onOpenChange,
  userId,
  resortRole,
  department,
  memberSince,
  onEdit,
}: StaffProfileViewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    username: null,
    email: null,
  });

  useEffect(() => {
    if (open && userId) {
      fetchProfileData();
    }
  }, [open, userId]);

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

      // Get email from staff_lookup_by_identifier function
      let email: string | null = null;
      if (profile?.username) {
        const { data: lookupData } = await supabase
          .rpc('staff_lookup_by_identifier', { p_identifier: profile.username });
        email = lookupData?.[0]?.email || null;
      }

      setProfileData({
        full_name: profile?.full_name || '',
        username: profile?.username || null,
        email: email,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    onOpenChange(false);
    onEdit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Profile
          </DialogTitle>
          <DialogDescription>
            View staff member details and access permissions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{profileData.full_name || 'Unnamed User'}</h3>
                {profileData.username && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    {profileData.username}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Role
                  </label>
                  <Badge variant="outline" className={ROLE_COLORS[resortRole]}>
                    {ROLE_LABELS[resortRole]}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    Department
                  </label>
                  <p className="text-sm">{department || 'Not assigned'}</p>
                </div>
              </div>

              {profileData.email && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  <p className="text-sm">{profileData.email}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Member Since
                </label>
                <p className="text-sm">{format(new Date(memberSince), 'MMMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleEdit}>
            Edit Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
