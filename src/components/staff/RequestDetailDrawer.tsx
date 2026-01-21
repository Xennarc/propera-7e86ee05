import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { RequestStatusPill } from '@/components/guest/requests/RequestStatusPill';
import {
  StaffServiceRequest,
  useRequestEvents,
  useStaffDepartmentMembers,
  useStaffRequestMutations,
  useStaffRequestPermissions,
  StaffRequestPriority,
} from '@/hooks/useStaffServiceRequests';
import { useResortScope } from '@/hooks/sync/useResortScope';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Clock,
  User,
  MapPin,
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  AlertTriangle,
  FileText,
  Send,
  Loader2,
  Calendar,
  Timer,
  Flag,
  Eye,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestDetailDrawerProps {
  request: StaffServiceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_CONFIG: Record<StaffRequestPriority, { label: string; className: string; icon: typeof Flag }> = {
  LOW: {
    label: 'Low',
    className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    icon: Flag,
  },
  NORMAL: {
    label: 'Normal',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: Flag,
  },
  HIGH: {
    label: 'High',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    icon: Flag,
  },
  URGENT: {
    label: 'Urgent',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    icon: AlertTriangle,
  },
};

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  CREATED: { label: 'Request submitted', icon: FileText, className: 'text-muted-foreground' },
  ACKNOWLEDGED: { label: 'Acknowledged', icon: Eye, className: 'text-blue-600 dark:text-blue-400' },
  ASSIGNED: { label: 'Assigned', icon: UserPlus, className: 'text-indigo-600 dark:text-indigo-400' },
  UNASSIGNED: { label: 'Unassigned', icon: User, className: 'text-muted-foreground' },
  STARTED: { label: 'Work started', icon: PlayCircle, className: 'text-primary' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  CANCELLED: { label: 'Cancelled', icon: AlertTriangle, className: 'text-muted-foreground' },
  PRIORITY_CHANGED: { label: 'Priority changed', icon: Flag, className: 'text-orange-600 dark:text-orange-400' },
  INTERNAL_NOTE_ADDED: { label: 'Internal note', icon: Lock, className: 'text-purple-600 dark:text-purple-400' },
};

export function RequestDetailDrawer({ request, open, onOpenChange }: RequestDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [internalNote, setInternalNote] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const { resortId, userId } = useResortScope();
  const { canAssign, canManage, canChangePriority } = useStaffRequestPermissions();
  const { data: events = [], isLoading: eventsLoading } = useRequestEvents(request?.id || '', open && !!request);
  const { data: departmentMembers = [] } = useStaffDepartmentMembers(
    resortId || '',
    request?.department_key
  );

  const {
    acknowledge,
    assign,
    start,
    complete,
    updatePriority,
    addInternalNote,
    isAcknowledging,
    isAssigning,
    isStarting,
    isCompleting,
    isAddingNote,
  } = useStaffRequestMutations();

  if (!request) return null;

  const priorityConfig = PRIORITY_CONFIG[request.priority];
  const PriorityIcon = priorityConfig.icon;

  const canAcknowledge = canManage && request.status === 'NEW';
  const canStart = canManage && (request.status === 'ASSIGNED' || request.status === 'ACKNOWLEDGED') && 
    (request.assigned_to === userId || canAssign);
  const canComplete = canManage && request.status === 'IN_PROGRESS';
  const isAssignedToMe = request.assigned_to === userId;

  const handleAcknowledge = async () => {
    await acknowledge(request.id);
  };

  const handleAssign = async () => {
    if (selectedAssignee) {
      await assign({ requestId: request.id, assignTo: selectedAssignee === '__unassign__' ? null : selectedAssignee });
      setAssignDialogOpen(false);
      setSelectedAssignee('');
    }
  };

  const handleStart = async () => {
    await start(request.id);
  };

  const handleComplete = async () => {
    await complete({ requestId: request.id, notes: completionNotes || undefined });
    setCompleteDialogOpen(false);
    setCompletionNotes('');
  };

  const handleAddNote = async () => {
    if (internalNote.trim()) {
      await addInternalNote({ requestId: request.id, note: internalNote.trim() });
      setInternalNote('');
    }
  };

  const handlePriorityChange = async (priority: StaffRequestPriority) => {
    await updatePriority({ requestId: request.id, priority });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <SheetTitle className="text-lg leading-tight pr-8">{request.title}</SheetTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RequestStatusPill status={request.status} />
              <Badge variant="outline" className={cn('gap-1', priorityConfig.className)}>
                <PriorityIcon className="h-3 w-3" />
                {priorityConfig.label}
              </Badge>
            </div>
            <SheetDescription className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {request.guest_name}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Room {request.room_number}
              </span>
            </SheetDescription>
          </SheetHeader>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap mt-4">
            {canAcknowledge && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
              >
                {isAcknowledging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                <span className="ml-1.5">Acknowledge</span>
              </Button>
            )}
            {canAssign && request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                <span className="ml-1.5">{request.assigned_to ? 'Reassign' : 'Assign'}</span>
              </Button>
            )}
            {canStart && (
              <Button
                size="sm"
                variant="default"
                onClick={handleStart}
                disabled={isStarting}
              >
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                <span className="ml-1.5">Start</span>
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setCompleteDialogOpen(true)}
                disabled={isCompleting}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="ml-1.5">Complete</span>
              </Button>
            )}
          </div>

          <Separator className="my-4" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="details" className="mt-0 space-y-4">
                {/* Request Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested:</span>
                    {request.is_asap ? (
                      <Badge variant="destructive" className="text-xs">ASAP</Badge>
                    ) : request.requested_for_at ? (
                      <span>{format(new Date(request.requested_for_at), 'PPp')}</span>
                    ) : (
                      <span>Not specified</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(request.created_at), 'PPp')}</span>
                    <span className="text-muted-foreground">
                      ({formatDistanceToNow(new Date(request.created_at), { addSuffix: true })})
                    </span>
                  </div>

                  {request.quantity > 1 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Quantity:</span>
                      <Badge variant="secondary">{request.quantity}</Badge>
                    </div>
                  )}

                  {request.assigned_to_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium">{request.assigned_to_name}</span>
                      {isAssignedToMe && <Badge variant="outline" className="text-xs">You</Badge>}
                    </div>
                  )}

                  {canChangePriority && request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Priority:</span>
                      <Select
                        value={request.priority}
                        onValueChange={(value) => handlePriorityChange(value as StaffRequestPriority)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Guest Notes */}
                {request.notes && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <MessageSquare className="h-4 w-4" />
                      Guest Notes
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
                  </div>
                )}

                {/* Internal Notes (staff only) */}
                {request.internal_notes && canManage && (
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2 text-purple-700 dark:text-purple-400">
                      <Lock className="h-4 w-4" />
                      Internal Notes
                    </div>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {request.internal_notes}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No events recorded yet.
                  </div>
                ) : (
                  <div className="relative space-y-4 pl-6">
                    {/* Timeline line */}
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

                    {events.map((event, idx) => {
                      const config = EVENT_TYPE_CONFIG[event.event_type] || {
                        label: event.event_type,
                        icon: Clock,
                        className: 'text-muted-foreground',
                      };
                      const Icon = config.icon;

                      return (
                        <div key={event.id} className="relative flex gap-3">
                          {/* Timeline dot */}
                          <div className={cn(
                            'absolute -left-4 top-1 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center',
                            idx === events.length - 1 ? 'bg-primary' : 'bg-muted'
                          )}>
                            <Icon className={cn('h-2.5 w-2.5', config.className)} />
                          </div>

                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-sm font-medium', config.className)}>
                                {config.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {event.actor_name && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                by {event.actor_name}
                              </p>
                            )}
                            {event.notes && (
                              <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">
                                {event.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-0 space-y-4">
                {canManage && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Add Internal Note
                    </label>
                    <Textarea
                      placeholder="Add a private note (only visible to staff)..."
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!internalNote.trim() || isAddingNote}
                    >
                      {isAddingNote ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span className="ml-1.5">Add Note</span>
                    </Button>
                  </div>
                )}

                {request.internal_notes ? (
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2 text-purple-700 dark:text-purple-400">
                      <Lock className="h-4 w-4" />
                      All Internal Notes
                    </div>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {request.internal_notes}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No internal notes yet.
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Assign Dialog */}
      <AlertDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Request</AlertDialogTitle>
            <AlertDialogDescription>
              Select a team member from {request.department_key} department to handle this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {request.assigned_to && (
                  <SelectItem value="__unassign__">
                    <span className="text-muted-foreground">Remove assignment</span>
                  </SelectItem>
                )}
                {departmentMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <span className="flex items-center gap-2">
                      {member.name}
                      <Badge variant="outline" className="text-[10px]">{member.dept_role}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssign} disabled={!selectedAssignee || isAssigning}>
              {isAssigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this request as completed. You can optionally add a completion note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional: Add completion notes..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={isCompleting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isCompleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
