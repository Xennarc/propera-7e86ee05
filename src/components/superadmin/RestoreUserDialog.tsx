import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlobalRole, ResortRole } from '@/types/database';
import { Loader2, RefreshCw, Crown, Info } from 'lucide-react';

interface UserMembership {
  id: string;
  resort_id: string;
  resort_name: string;
  resort_role: ResortRole;
}

interface UserWithMemberships {
  id: string;
  full_name: string | null;
  username: string | null;
  global_role: GlobalRole;
  created_at: string;
  memberships: UserMembership[];
  is_disabled?: boolean;
  deleted_at?: string | null;
}

interface RestoreUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithMemberships | null;
  onSuccess: () => void;
}

export function RestoreUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: RestoreUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('superadmin-user-admin', {
        body: {
          mode: 'restore',
          user_id: user.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to restore user');

      toast.success(`${user.full_name || 'User'} has been restored`);
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error(error.message || 'Failed to restore user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const isSuperAdmin = user.global_role === 'SUPER_ADMIN';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-success" />
            Restore User
          </DialogTitle>
          <DialogDescription>
            This will re-enable the user's access to the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={isSuperAdmin ? 'bg-destructive/10 text-destructive' : 'bg-muted'}>
                {user.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.full_name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground truncate">@{user.username || 'no-username'}</p>
            </div>
            {isSuperAdmin && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                <Crown className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </div>

          {/* Note about memberships */}
          <div className="flex gap-2 p-3 bg-info/10 border border-info/20 rounded-lg text-sm">
            <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <div className="text-info">
              <strong>Note:</strong> If memberships were removed during deactivation, they will not be automatically restored. You'll need to re-grant resort access separately.
            </div>
          </div>

          {/* Current memberships */}
          {user.memberships.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Current memberships:</p>
              <div className="flex flex-wrap gap-1">
                {user.memberships.map(m => (
                  <Badge key={m.id} variant="outline" className="text-xs">
                    {m.resort_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleRestore}
            disabled={isLoading}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
