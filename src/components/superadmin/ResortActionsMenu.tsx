import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useStartSupportSession } from '@/hooks/useSupportSessions';
import { usePurgeJob } from '@/hooks/usePurgeJob';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Eye,
  Settings,
  UserCheck,
  Pause,
  Play,
  RefreshCw,
  ClipboardList,
  Trash2,
  AlertTriangle,
  Loader2,
  XCircle,
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
  const [confirmDemoDelete, setConfirmDemoDelete] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);

  // Use the purge job hook for comprehensive deletion
  const { job: purgeJob, isPurging, startPurge, retryPurge } = usePurgeJob(resort.id);

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

  // Handle Audit/Activity view
  const handleViewAudit = () => {
    navigate(`/superadmin/audit?resort=${resort.id}`);
  };

  // Validation for delete action (triple confirmation)
  const codeMatches = confirmCode === resort.code;
  const deleteWordMatches = confirmDelete === 'DELETE';
  const demoWordMatches = !resort.is_demo || confirmDemoDelete === 'DELETE DEMO';
  const canDeleteResort = codeMatches && deleteWordMatches && demoWordMatches && understandCheckbox;

  // Confirmation word for RPC
  const confirmWord = resort.is_demo ? 'DELETE DEMO' : 'DELETE';

  // Handle purge request
  const handlePurgeRequest = async () => {
    try {
      await startPurge({
        resortId: resort.id,
        resortCode: resort.code,
        confirmWord,
        reason: deleteReason || undefined,
      });
      
      toast.success('Purge job started');
      // Don't close dialog - show progress instead
    } catch (error) {
      console.error('Purge request failed:', error);
    }
  };

  // Handle purge retry
  const handleRetryPurge = async () => {
    if (!purgeJob) return;
    
    try {
      await retryPurge(purgeJob.id);
      toast.success('Retry initiated');
    } catch (error) {
      console.error('Purge retry failed:', error);
    }
  };

  // Reset delete dialog state
  const resetDeleteDialog = () => {
    setConfirmCode('');
    setConfirmDelete('');
    setConfirmDemoDelete('');
    setDeleteReason('');
    setUnderstandCheckbox(false);
  };

  // Handle dialog close - only close if not purging
  const handleDeleteDialogChange = (open: boolean) => {
    if (!open && (isPurging || (purgeJob && ['queued', 'running'].includes(purgeJob.status)))) {
      // Don't close while purge is in progress
      return;
    }
    
    if (!open) {
      resetDeleteDialog();
    }
    
    // If purge completed successfully, close dialog and refresh
    if (purgeJob?.status === 'completed') {
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
      toast.success(`${resort.name} deleted successfully`);
      resetDeleteDialog();
    }
    
    setDeleteDialogOpen(open);
  };

  const isSuspended = resort.status === 'INACTIVE';
  const canConfirmSuspend = confirmCode === resort.code;

  // Check if there's an active or recent purge job
  const hasPurgeJob = purgeJob && ['queued', 'running', 'failed', 'completed'].includes(purgeJob.status);
  const isPurgeComplete = purgeJob?.status === 'completed';
  const isPurgeFailed = purgeJob?.status === 'failed';
  const isPurgeActive = purgeJob && ['queued', 'running'].includes(purgeJob.status);

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

      {/* Delete Dialog with Triple Confirmation + Progress */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Resort Permanently
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Purge Progress Section */}
                {hasPurgeJob && (
                  <div className={`p-4 border rounded-lg ${
                    isPurgeFailed 
                      ? 'border-destructive/50 bg-destructive/10' 
                      : isPurgeComplete
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-amber-500/50 bg-amber-500/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {isPurgeActive ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                      ) : isPurgeFailed ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium">
                        {purgeJob?.status === 'queued' && 'Purge Queued'}
                        {purgeJob?.status === 'running' && 'Purge In Progress'}
                        {purgeJob?.status === 'failed' && 'Purge Failed'}
                        {purgeJob?.status === 'completed' && 'Purge Completed'}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {purgeJob?.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {isPurgeActive && (
                      <>
                        <Progress value={purgeJob?.progress || 0} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {purgeJob?.current_step || 'Initializing...'} ({purgeJob?.progress}%)
                        </p>
                      </>
                    )}
                    
                    {isPurgeFailed && (
                      <>
                        <p className="text-xs text-destructive mb-2">{purgeJob?.error}</p>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={handleRetryPurge}
                          disabled={isPurging}
                        >
                          {isPurging ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry Purge
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    {isPurgeComplete && (
                      <p className="text-xs text-green-600">
                        Resort and all associated data have been permanently deleted.
                      </p>
                    )}
                  </div>
                )}

                {/* Show confirmation form if no active purge job */}
                {!hasPurgeJob && (
                  <>
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
                        <li>All uploaded files and images</li>
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
                      {resort.is_demo && (
                        <div>
                          <Label htmlFor="delete-demo-confirm">Type <strong>DELETE DEMO</strong> to confirm demo deletion</Label>
                          <Input
                            id="delete-demo-confirm"
                            value={confirmDemoDelete}
                            onChange={(e) => setConfirmDemoDelete(e.target.value)}
                            placeholder="DELETE DEMO"
                            className="mt-2"
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="delete-reason">Reason (optional)</Label>
                        <Textarea
                          id="delete-reason"
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          placeholder="Why is this resort being deleted?"
                          className="mt-2"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                          id="understand-delete"
                          checked={understandCheckbox}
                          onCheckedChange={(checked) => setUnderstandCheckbox(checked === true)}
                        />
                        <Label htmlFor="understand-delete" className="text-sm cursor-pointer">
                          I understand this action cannot be undone
                        </Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isPurgeComplete ? (
              <AlertDialogAction onClick={() => handleDeleteDialogChange(false)}>
                Close
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel 
                  onClick={resetDeleteDialog}
                  disabled={isPurgeActive}
                >
                  Cancel
                </AlertDialogCancel>
                {!hasPurgeJob && (
                  <AlertDialogAction
                    onClick={handlePurgeRequest}
                    disabled={!canDeleteResort || isPurging}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPurging ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      'Delete Permanently'
                    )}
                  </AlertDialogAction>
                )}
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
