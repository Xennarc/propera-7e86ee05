import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useStartSupportSession } from '@/hooks/useSupportSessions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Eye,
  ExternalLink,
  Settings,
  UserCheck,
  Pause,
  Play,
  RefreshCw,
  ClipboardList,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface Resort {
  id: string;
  name: string;
  code: string;
  status: string;
  is_demo: boolean;
  subscription_tier: string;
}

interface ResortActionsMenuProps {
  resort: Resort;
  onOpenSettings: (resort: Resort) => void;
  onRefresh: () => void;
}

export function ResortActionsMenu({ resort, onOpenSettings, onRefresh }: ResortActionsMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentResort, resorts } = useResort();
  const startSupportSession = useStartSupportSession();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');

  // Check if the resort status column supports suspend (INACTIVE status)
  const canSuspend = resort.status === 'ACTIVE' || resort.status === 'INACTIVE';

  // Handle View Details
  const handleViewResort = () => {
    navigate(`/superadmin/resorts/${resort.id}`);
  };

  // Handle Switch to Resort (impersonation via support session)
  const handleImpersonate = async () => {
    try {
      await startSupportSession.mutateAsync({
        sessionType: 'staff',
        resortId: resort.id,
        readOnly: false,
        reason: `Super admin access to ${resort.name}`,
        durationMinutes: 30,
      });
      
      const fullResort = resorts.find(r => r.id === resort.id);
      if (fullResort) {
        setCurrentResort(fullResort);
        navigate('/staff/dashboard');
        toast.success(`Switched to ${resort.name} with support session`);
      }
    } catch (error) {
      toast.error('Failed to start support session');
    }
  };

  // Suspend/Unsuspend mutation
  const suspendMutation = useMutation({
    mutationFn: async (suspend: boolean) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const { error } = await supabase
        .from('resorts')
        .update({ status: suspend ? 'INACTIVE' : 'ACTIVE' })
        .eq('id', resort.id);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        actor_id: userId!,
        action: suspend ? 'resort_suspended' : 'resort_unsuspended',
        resort_id: resort.id,
        metadata_json: { resort_name: resort.name },
      });

      return suspend;
    },
    onSuccess: (suspended) => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      onRefresh();
      toast.success(suspended ? `${resort.name} suspended` : `${resort.name} reactivated`);
      setSuspendDialogOpen(false);
      setConfirmCode('');
    },
    onError: () => {
      toast.error('Failed to update resort status');
    },
  });

  // Reseed demo mutation (only for demo resorts - calls demo-reset edge function)
  const reseedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('demo-reset', {
        body: { action: 'run' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      onRefresh();
      toast.success(`Demo data reseeded for ${resort.name}`);
    },
    onError: () => {
      toast.error('Failed to reseed demo data');
    },
  });

  // Delete mutation - uses backend function to bypass RLS
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('delete-resort', {
        body: { resortId: resort.id },
      });

      if (error) throw error;
      
      // Check for error in response body
      if (data?.error) {
        throw new Error(data.details || data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      
      // Clear current resort if it was the deleted one
      const currentResort = resorts.find(r => r.id === resort.id);
      if (currentResort) {
        const remaining = resorts.filter(r => r.id !== resort.id);
        if (remaining.length > 0) {
          setCurrentResort(remaining[0]);
        } else {
          setCurrentResort(null as any);
        }
      }
      
      onRefresh();
      toast.success(`${resort.name} deleted`);
      setDeleteDialogOpen(false);
      setConfirmCode('');
      setConfirmDelete('');
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      const message = error?.message || 'Failed to delete resort';
      toast.error(`Delete failed: ${message}`);
    },
  });

  // Handle Audit/Activity view
  const handleViewAudit = () => {
    navigate(`/superadmin/audit?resort=${resort.id}`);
  };

  const isSuspended = resort.status === 'INACTIVE';
  const canDelete = confirmCode === resort.code && confirmDelete === 'DELETE';
  const canConfirmSuspend = confirmCode === resort.code;

  return (
    <>
      <TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleViewResort}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onOpenSettings(resort)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleImpersonate}>
              <UserCheck className="mr-2 h-4 w-4" />
              Impersonate / Staff Console
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {canSuspend ? (
              <DropdownMenuItem onClick={() => setSuspendDialogOpen(true)}>
                {isSuspended ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Unsuspend Resort
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Suspend Resort
                  </>
                )}
              </DropdownMenuItem>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem disabled className="opacity-50">
                    <Pause className="mr-2 h-4 w-4" />
                    Suspend Resort
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Not supported by current schema</p>
                </TooltipContent>
              </Tooltip>
            )}

            {resort.is_demo ? (
              <DropdownMenuItem 
                onClick={() => reseedMutation.mutate()}
                disabled={reseedMutation.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${reseedMutation.isPending ? 'animate-spin' : ''}`} />
                {reseedMutation.isPending ? 'Reseeding...' : 'Reseed Demo Data'}
              </DropdownMenuItem>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem disabled className="opacity-50">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reseed Demo Data
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Only available for demo resorts</p>
                </TooltipContent>
              </Tooltip>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleViewAudit}>
              <ClipboardList className="mr-2 h-4 w-4" />
              View Audit / Activity
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Resort
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      {/* Suspend/Unsuspend Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {isSuspended ? 'Unsuspend Resort' : 'Suspend Resort'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {isSuspended 
                  ? `You are about to unsuspend ${resort.name}. This will restore access for all staff and guests.`
                  : `You are about to suspend ${resort.name}. This will prevent all staff and guests from accessing the resort.`
                }
              </p>
              <div className="pt-3">
                <Label htmlFor="confirm-code">Type the resort code to confirm: <strong>{resort.code}</strong></Label>
                <Input
                  id="confirm-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder={resort.code}
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmCode(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => suspendMutation.mutate(!isSuspended)}
              disabled={!canConfirmSuspend || suspendMutation.isPending}
              className={isSuspended ? '' : 'bg-warning text-warning-foreground hover:bg-warning/90'}
            >
              {suspendMutation.isPending ? 'Processing...' : isSuspended ? 'Unsuspend' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog with Double Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Resort Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm">
                <p className="font-medium text-destructive">⚠️ This action is irreversible!</p>
                <p className="mt-2">
                  Deleting <strong>{resort.name}</strong> will permanently remove:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All guests and their data</li>
                  <li>All bookings and reservations</li>
                  <li>All activities and sessions</li>
                  <li>All staff memberships</li>
                  <li>All settings and configurations</li>
                </ul>
              </div>
              
              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="delete-code">Type the resort code: <strong>{resort.code}</strong></Label>
                  <Input
                    id="delete-code"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder={resort.code}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="delete-confirm">Type <strong>DELETE</strong> to confirm</Label>
                  <Input
                    id="delete-confirm"
                    value={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.value)}
                    placeholder="DELETE"
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmCode(''); setConfirmDelete(''); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={!canDelete || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
