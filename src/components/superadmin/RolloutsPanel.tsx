import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useResort } from '@/contexts/ResortContext';
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
} from 'lucide-react';

type ChangeType = 'feature_flag' | 'plan_tier' | 'branding_refresh' | 'module_toggle' | 'seo_regen';

interface RolloutChange {
  type: ChangeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  dangerous?: boolean;
}

const ROLLOUT_CHANGES: RolloutChange[] = [
  { type: 'feature_flag', label: 'Feature Flag', description: 'Toggle a feature flag on/off', icon: ToggleRight },
  { type: 'plan_tier', label: 'Plan Tier', description: 'Change subscription tier', icon: CreditCard },
  { type: 'branding_refresh', label: 'Branding Refresh', description: 'Refresh guest portal branding', icon: Paintbrush },
  { type: 'module_toggle', label: 'Module Toggle', description: 'Enable/disable a module', icon: Settings },
  { type: 'seo_regen', label: 'SEO Regenerate', description: 'Regenerate sitemap and SEO', icon: Globe },
];

export function RolloutsPanel() {
  const { resorts } = useResort();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedChange, setSelectedChange] = useState<ChangeType | null>(null);
  const [scope, setScope] = useState<'one' | 'selected' | 'all'>('one');
  const [selectedResorts, setSelectedResorts] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeResorts = resorts.filter(r => r.status === 'ACTIVE' && !r.is_demo);

  const handleSelectChange = (type: ChangeType) => {
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

  const handleConfirm = () => {
    if (scope === 'all' && confirmText !== 'APPLY TO ALL') {
      toast.error('Please type APPLY TO ALL to confirm');
      return;
    }
    setDialogOpen(true);
  };

  const handleExecuteRollout = () => {
    // In production, this would call the API
    toast.success('Rollout executed successfully', {
      description: `Applied ${selectedChange} to ${scope === 'all' ? 'all resorts' : selectedResorts.length + ' resort(s)'}`,
    });
    setDialogOpen(false);
    resetWizard();
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedChange(null);
    setScope('one');
    setSelectedResorts([]);
    setConfirmText('');
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
          </div>
          <Badge variant="outline" className="text-xs">
            Step {step} of 4
          </Badge>
        </div>
        <CardDescription>Deploy changes across resorts with guardrails</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Select Change Type */}
        {step === 1 && (
          <div className="space-y-3">
            {ROLLOUT_CHANGES.map((change) => (
              <button
                key={change.type}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-all text-left"
                onClick={() => handleSelectChange(change.type)}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <change.icon className="h-5 w-5 text-primary" />
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

            <Button 
              className="w-full" 
              onClick={handleConfirm}
              disabled={scope === 'all' && confirmText !== 'APPLY TO ALL'}
            >
              Confirm & Execute
            </Button>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Execute Rollout?
              </DialogTitle>
              <DialogDescription>
                This will apply {getChangeDetails()?.label.toLowerCase()} to {getAffectedCount()} resort(s).
                All changes will be logged to the audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium">Summary</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Change: {getChangeDetails()?.label}</li>
                <li>• Scope: {scope === 'all' ? 'All resorts' : `${getAffectedCount()} resort(s)`}</li>
                <li>• Rollback: Available for 24 hours</li>
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExecuteRollout}>
                <Rocket className="h-4 w-4 mr-2" />
                Execute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
