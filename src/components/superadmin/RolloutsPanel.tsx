import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useResort } from '@/contexts/ResortContext';
import { useRolloutHistory, useRollbackRollout } from '@/hooks/useRollouts';
import { useCreateRolloutJob, useExecuteRollout, useRolloutJobs } from '@/hooks/useRolloutJobs';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Rocket,
  ToggleRight,
  CreditCard,
  Paintbrush,
  Settings,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ChevronRight,
  Undo2,
  History,
  Clock,
  Shield,
  Eye,
  Loader2,
} from 'lucide-react';

type ChangeType = 'enable_prearrival' | 'disable_prearrival' | 'enable_guest_booking' | 'disable_guest_booking' | 
                  'enable_loyalty' | 'disable_loyalty' | 'enable_activities' | 'disable_activities' |
                  'enable_dining' | 'disable_dining' | 'refresh_branding' | 'refresh_seo';

interface RolloutChange {
  type: ChangeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  dangerous?: boolean;
}

const ROLLOUT_CHANGES: RolloutChange[] = [
  { type: 'enable_prearrival', label: 'Enable Pre-arrival', description: 'Turn on pre-arrival for resorts', icon: ToggleRight },
  { type: 'disable_prearrival', label: 'Disable Pre-arrival', description: 'Turn off pre-arrival', icon: ToggleRight, dangerous: true },
  { type: 'enable_guest_booking', label: 'Enable Guest Booking', description: 'Allow guest self-booking', icon: Settings },
  { type: 'disable_guest_booking', label: 'Disable Guest Booking', description: 'Turn off guest self-booking', icon: Settings, dangerous: true },
  { type: 'enable_loyalty', label: 'Enable Loyalty', description: 'Turn on loyalty program', icon: CreditCard },
  { type: 'disable_loyalty', label: 'Disable Loyalty', description: 'Turn off loyalty program', icon: CreditCard, dangerous: true },
  { type: 'enable_activities', label: 'Enable Activities', description: 'Turn on activities module', icon: ToggleRight },
  { type: 'enable_dining', label: 'Enable Dining', description: 'Turn on dining module', icon: ToggleRight },
  { type: 'refresh_branding', label: 'Refresh Branding', description: 'Increment branding version', icon: Paintbrush },
  { type: 'refresh_seo', label: 'Regenerate SEO', description: 'Increment SEO version', icon: Globe },
];

interface RolloutsPanelProps {
  writeMode?: boolean;
}

export function RolloutsPanel({ writeMode = false }: RolloutsPanelProps) {
  const { resorts } = useResort();
  const [activeTab, setActiveTab] = useState<'execute' | 'history'>('execute');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedChange, setSelectedChange] = useState<ChangeType | null>(null);
  const [scope, setScope] = useState<'one' | 'selected' | 'all'>('one');
  const [selectedResorts, setSelectedResorts] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [showDryRunPreview, setShowDryRunPreview] = useState(false);

  const { data: rolloutHistory, isLoading: loadingHistory } = useRolloutHistory(20);
  const { jobs: rolloutJobs, isLoading: loadingJobs, refetchJobs } = useRolloutJobs();
  const createJob = useCreateRolloutJob();
  const executeJob = useExecuteRollout();
  const rollbackRollout = useRollbackRollout();

  const activeResorts = resorts.filter(r => r.status === 'ACTIVE' && !r.is_demo);

  const handleSelectChange = (type: ChangeType) => {
    if (!writeMode) {
      toast.error('Enable Write Mode to execute rollouts');
      return;
    }
    setSelectedChange(type);
    setStep(2);
  };

  const handleScopeNext = () => {
    if (scope === 'one' && selectedResorts.length === 0) {
      toast.error('Please select a resort');
      return;
    }
    if (scope === 'selected' && selectedResorts.length === 0) {
      toast.error('Please select at least one resort');
      return;
    }
    setStep(3);
  };

  const handleDryRun = async () => {
    if (!selectedChange) return;

    const resortIds = scope === 'all' 
      ? activeResorts.map(r => r.id) 
      : selectedResorts;

    try {
      // Create job first
      const job = await createJob.mutateAsync({
        changeType: selectedChange,
        changeLabel: getChangeDetails()?.label || selectedChange,
        scope,
        targetResortIds: resortIds,
        notes: notes || undefined,
      });

      // Execute dry run
      const result = await executeJob.mutateAsync({
        jobId: job.id,
        dryRun: true,
      });

      setDryRunResult(result);
      setShowDryRunPreview(true);
    } catch (error) {
      toast.error('Failed to run preview');
    }
  };

  const handleExecuteRollout = async () => {
    if (!selectedChange || !dryRunResult) return;

    try {
      // Find the job ID from dry run
      const pendingJob = rolloutJobs?.find(j => j.status === 'dry_run');
      if (!pendingJob) {
        toast.error('No pending job found');
        return;
      }

      await executeJob.mutateAsync({
        jobId: pendingJob.id,
        dryRun: false,
      });

      setDialogOpen(false);
      setShowDryRunPreview(false);
      resetWizard();
      toast.success('Rollout executed successfully');
    } catch (error) {
      toast.error('Rollout failed');
    }
  };

  const handleRollback = async (rolloutId: string) => {
    try {
      await rollbackRollout.mutateAsync(rolloutId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedChange(null);
    setScope('one');
    setSelectedResorts([]);
    setConfirmText('');
    setNotes('');
    setDryRunResult(null);
  };

  const getChangeDetails = () => {
    return ROLLOUT_CHANGES.find(c => c.type === selectedChange);
  };

  const getAffectedCount = () => {
    if (scope === 'all') return activeResorts.length;
    if (scope === 'selected') return selectedResorts.length;
    return selectedResorts.length > 0 ? 1 : 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle>Rollouts</CardTitle>
            {!writeMode && (
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Read-only
              </Badge>
            )}
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="h-8">
              <TabsTrigger value="execute" className="text-xs">Execute</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>Deploy changes across resorts with guardrails</CardDescription>
      </CardHeader>
      <CardContent>
        {activeTab === 'execute' && (
          <>
            {/* Write Mode Warning */}
            {!writeMode && (
              <div className="p-3 mb-4 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Enable Write Mode in the header to execute rollouts</span>
              </div>
            )}

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">Step {step} of 4</Badge>
              {step > 1 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={resetWizard}>
                  Reset
                </Button>
              )}
            </div>

            {/* Step 1: Select Change Type */}
            {step === 1 && (
              <div className="space-y-3">
                {ROLLOUT_CHANGES.map((change) => (
                  <button
                    key={change.type}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-all text-left ${!writeMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleSelectChange(change.type)}
                    disabled={!writeMode}
                  >
                    <div className={`p-2 rounded-lg ${change.dangerous ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                      <change.icon className={`h-5 w-5 ${change.dangerous ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{change.label}</p>
                      <p className="text-xs text-muted-foreground">{change.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Select Scope */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <span className="text-sm font-medium">{getChangeDetails()?.label}</span>
                </div>

                <div className="space-y-3">
                  <button
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      scope === 'one' ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setScope('one')}
                  >
                    <Building2 className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-sm">Single Resort</p>
                      <p className="text-xs text-muted-foreground">Apply to one resort</p>
                    </div>
                  </button>

                  <button
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      scope === 'selected' ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setScope('selected')}
                  >
                    <Building2 className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-sm">Selected Resorts</p>
                      <p className="text-xs text-muted-foreground">Choose specific resorts</p>
                    </div>
                  </button>

                  <button
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      scope === 'all' ? 'bg-warning/5 border-warning/30' : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setScope('all')}
                  >
                    <Globe className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium text-sm">All Resorts</p>
                      <p className="text-xs text-muted-foreground">Apply to {activeResorts.length} active resorts</p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-warning/10 text-warning border-warning/30 text-[10px]">
                      Requires confirmation
                    </Badge>
                  </button>
                </div>

                {(scope === 'one' || scope === 'selected') && (
                  <div className="mt-4">
                    <Label className="text-sm">Select Resort(s)</Label>
                    <ScrollArea className="h-40 mt-2 border rounded-lg p-2">
                      {activeResorts.map(resort => (
                        <div key={resort.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded-lg">
                          <Checkbox
                            checked={selectedResorts.includes(resort.id)}
                            onCheckedChange={(checked) => {
                              if (scope === 'one') {
                                setSelectedResorts(checked ? [resort.id] : []);
                              } else {
                                setSelectedResorts(prev => 
                                  checked ? [...prev, resort.id] : prev.filter(id => id !== resort.id)
                                );
                              }
                            }}
                          />
                          <span className="text-sm">{resort.name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                <Button className="w-full mt-4" onClick={handleScopeNext}>
                  Continue
                </Button>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                  <span className="text-sm font-medium">Preview Impact</span>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Change Type</span>
                    <span className="font-medium text-sm">{getChangeDetails()?.label}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Affected Resorts</span>
                    <span className="font-medium text-sm">{getAffectedCount()} resort(s)</span>
                  </div>
                  {scope !== 'all' && selectedResorts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedResorts.map(id => {
                        const resort = resorts.find(r => r.id === id);
                        return resort ? (
                          <Badge key={id} variant="outline" className="text-xs">{resort.name}</Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm">Notes (optional)</Label>
                  <Input
                    className="mt-2"
                    placeholder="Add context for this rollout..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {scope === 'all' && (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Confirmation Required</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Type <span className="font-mono bg-warning/20 px-1 rounded">APPLY TO ALL</span> to confirm
                        </p>
                        <Input
                          className="mt-2"
                          placeholder="Type here..."
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1" 
                    onClick={handleDryRun}
                    disabled={createJob.isPending || (scope === 'all' && confirmText !== 'APPLY TO ALL')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Dry Run Preview Dialog */}
            <Dialog open={showDryRunPreview} onOpenChange={setShowDryRunPreview}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview: {getChangeDetails()?.label}
                  </DialogTitle>
                  <DialogDescription>
                    Review the changes before applying
                  </DialogDescription>
                </DialogHeader>
                {dryRunResult && (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {dryRunResult.results?.map((result: any) => {
                        const resort = resorts.find(r => r.id === result.resortId);
                        return (
                          <div key={result.resortId} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{resort?.name || result.resortId}</span>
                              {result.success ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30">Ready</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Error</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Old: {JSON.stringify(result.oldValue)}</p>
                              <p>New: {JSON.stringify(result.newValue)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDryRunPreview(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExecuteRollout} disabled={executeJob.isPending}>
                    {executeJob.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Apply Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {loadingHistory || loadingJobs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : rolloutHistory && rolloutHistory.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {rolloutHistory.map(rollout => (
                    <div key={rollout.id} className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={rollout.status === 'executed' ? 'default' : rollout.status === 'rolled_back' ? 'secondary' : 'outline'} className="text-xs">
                              {rollout.status}
                            </Badge>
                            <span className="font-medium text-sm">{rollout.change_label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rollout.scope === 'all' 
                              ? 'All resorts' 
                              : `${rollout.affected_resort_ids?.length || 0} resort(s)`}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(rollout.executed_at), { addSuffix: true })}
                            {rollout.executor_name && (
                              <>
                                <span>•</span>
                                <span>by {rollout.executor_name}</span>
                              </>
                            )}
                          </div>
                          {rollout.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">"{rollout.notes}"</p>
                          )}
                        </div>
                        {rollout.status === 'executed' && writeMode && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRollback(rollout.id)}
                            disabled={rollbackRollout.isPending}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="font-medium">No rollouts yet</p>
                <p className="text-sm text-muted-foreground">Executed rollouts will appear here</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
