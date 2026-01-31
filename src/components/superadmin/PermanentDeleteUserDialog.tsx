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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlobalRole, ResortRole } from '@/types/database';
import { AlertTriangle, Loader2, Trash2, Crown, Building2, AlertOctagon } from 'lucide-react';

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

interface PermanentDeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithMemberships | null;
  onSuccess: () => void;
}

const CONFIRMATION_PHRASE = 'DELETE';

export function PermanentDeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: PermanentDeleteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setConfirmationText('');
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (confirmationText !== CONFIRMATION_PHRASE) {
      toast.error(`Please type "${CONFIRMATION_PHRASE}" to confirm`);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('superadmin-user-admin', {
        body: {
          mode: 'delete_permanent',
          user_id: user.id,
          reason: reason.trim() || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete user');

      toast.success(`${user.full_name || 'User'} has been permanently deleted`);
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Deletion error:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const isSuperAdmin = user.global_role === 'SUPER_ADMIN';
  const isConfirmed = confirmationText === CONFIRMATION_PHRASE;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Permanently Delete User
          </DialogTitle>
          <DialogDescription>
            This action is <strong>irreversible</strong>. The user's auth account will be deleted and they will never be able to log in again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Danger warning */}
          <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
            <AlertOctagon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-destructive space-y-1">
              <p><strong>This action CANNOT be undone.</strong></p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>Auth account will be permanently deleted</li>
                <li>All resort memberships will be removed</li>
                <li>User's name will be scrubbed from profile</li>
                <li>Audit logs will be preserved for compliance</li>
              </ul>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border-2 border-destructive/30">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={isSuperAdmin ? 'bg-destructive/10 text-destructive' : 'bg-muted'}>
                {user.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.full_name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground truncate">@{user.username || 'no-username'}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{user.id}</p>
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
            <div className="flex gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-warning">
                <strong>Extreme caution:</strong> Deleting a Super Admin is a significant action that should only be done when absolutely necessary.
              </div>
            </div>
          )}

          {/* Memberships count */}
          {user.memberships.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{user.memberships.length} resort membership{user.memberships.length !== 1 ? 's' : ''} will be removed</span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason (optional but recommended)</Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter a reason for permanent deletion..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={2}
            />
          </div>

          {/* Confirmation phrase */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <code className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-bold">{CONFIRMATION_PHRASE}</code> to confirm
            </Label>
            <Input
              id="confirmation"
              placeholder={`Type ${CONFIRMATION_PHRASE} here...`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
              disabled={isLoading}
              className={isConfirmed ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || !isConfirmed}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Permanently Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
