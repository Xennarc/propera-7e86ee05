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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlobalRole, ResortRole } from '@/types/database';
import { AlertTriangle, Loader2, UserX, Crown, Building2 } from 'lucide-react';

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

interface RemoveUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithMemberships | null;
  onSuccess: () => void;
}

export function RemoveUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: RemoveUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [removeMemberships, setRemoveMemberships] = useState(false);

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setRemoveMemberships(false);
      onOpenChange(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('superadmin-user-admin', {
        body: {
          mode: 'deactivate',
          user_id: user.id,
          reason: reason.trim() || undefined,
          remove_memberships: removeMemberships,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to deactivate user');

      toast.success(`${user.full_name || 'User'} has been deactivated`);
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Deactivation error:', error);
      toast.error(error.message || 'Failed to deactivate user');
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
            <UserX className="h-5 w-5 text-warning" />
            Deactivate User
          </DialogTitle>
          <DialogDescription>
            This will disable the user's access to the platform. They can be restored later.
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

          {/* Warning for super admin */}
          {isSuperAdmin && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-destructive">
                <strong>Warning:</strong> This user is a Super Admin. Deactivating them will remove their platform-wide access.
              </div>
            </div>
          )}

          {/* Memberships count */}
          {user.memberships.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{user.memberships.length} resort membership{user.memberships.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Remove memberships checkbox */}
          {user.memberships.length > 0 && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="remove-memberships"
                checked={removeMemberships}
                onCheckedChange={(checked) => setRemoveMemberships(checked === true)}
                disabled={isLoading}
              />
              <div className="grid gap-1">
                <Label htmlFor="remove-memberships" className="font-normal cursor-pointer">
                  Also remove resort memberships
                </Label>
                <p className="text-xs text-muted-foreground">
                  If unchecked, memberships are preserved but inaccessible while disabled
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter a reason for deactivation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Deactivate User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
