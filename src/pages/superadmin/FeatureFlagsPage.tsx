import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { toast } from 'sonner';
import {
  ToggleRight,
  Search,
  AlertTriangle,
  Zap,
  FlaskConical,
  Shield,
  Building2,
  Info,
  Save,
} from 'lucide-react';
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

// Feature flags definition (in a real app, this would come from the database)
const FEATURE_FLAGS = [
  // Core Features
  { key: 'enable_activities', label: 'Activities Module', description: 'Enable activity management and bookings', category: 'core', tier: 'essential' },
  { key: 'enable_dining', label: 'Dining Module', description: 'Enable restaurant management and reservations', category: 'core', tier: 'essential' },
  { key: 'enable_spa', label: 'Spa Module', description: 'Enable spa and wellness bookings', category: 'core', tier: 'professional' },
  
  // Guest Portal
  { key: 'enable_guest_portal', label: 'Guest Portal', description: 'Enable guest self-service portal', category: 'guest', tier: 'essential' },
  { key: 'enable_prearrival', label: 'Pre-Arrival', description: 'Enable pre-arrival check-in flow', category: 'guest', tier: 'professional' },
  { key: 'enable_guest_bookings', label: 'Guest Self-Booking', description: 'Allow guests to book activities/dining', category: 'guest', tier: 'essential' },
  
  // Premium Features
  { key: 'enable_loyalty', label: 'Loyalty Program', description: 'Enable loyalty points and rewards', category: 'premium', tier: 'elite', dangerous: true },
  { key: 'enable_ai_insights', label: 'AI Insights', description: 'Enable AI-powered analytics and suggestions', category: 'premium', tier: 'elite' },
  { key: 'enable_multi_language', label: 'Multi-Language', description: 'Enable guest portal translations', category: 'premium', tier: 'professional' },
  
  // Experimental
  { key: 'enable_waitlist', label: 'Waitlist System', description: 'Enable waitlist for full sessions', category: 'experimental', tier: 'essential' },
  { key: 'enable_travel_party', label: 'Travel Party', description: 'Enable travel party management', category: 'experimental', tier: 'professional' },
  { key: 'enable_smart_suggestions', label: 'Smart Suggestions', description: 'AI-powered activity suggestions', category: 'experimental', tier: 'elite' },
  
  // Danger Zone
  { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Put platform in maintenance mode', category: 'danger', dangerous: true },
  { key: 'disable_guest_access', label: 'Disable Guest Access', description: 'Prevent all guest portal access', category: 'danger', dangerous: true },
  { key: 'emergency_readonly', label: 'Emergency Read-Only', description: 'Disable all write operations', category: 'danger', dangerous: true },
];

const CATEGORIES = {
  core: { label: 'Core Features', icon: Building2, color: 'text-primary' },
  guest: { label: 'Guest Portal', icon: ToggleRight, color: 'text-success' },
  premium: { label: 'Premium Features', icon: Zap, color: 'text-warning' },
  experimental: { label: 'Experimental', icon: FlaskConical, color: 'text-info' },
  danger: { label: 'Danger Zone', icon: AlertTriangle, color: 'text-destructive' },
};

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const { resorts } = useResort();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResort, setSelectedResort] = useState<string>('global');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; flag: typeof FEATURE_FLAGS[0] | null; newValue: boolean }>({
    open: false,
    flag: null,
    newValue: false,
  });

  // Simulated flag states (in real app, would come from database)
  const [flagStates, setFlagStates] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = { global: {} };
    FEATURE_FLAGS.forEach(flag => {
      initial.global[flag.key] = !flag.dangerous; // Enable all non-dangerous by default
    });
    return initial;
  });

  const filteredFlags = FEATURE_FLAGS.filter(flag => {
    if (!searchQuery) return true;
    return flag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           flag.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const groupedFlags = Object.entries(CATEGORIES).map(([key, config]) => ({
    key,
    ...config,
    flags: filteredFlags.filter(f => f.category === key),
  })).filter(g => g.flags.length > 0);

  const handleToggle = (flag: typeof FEATURE_FLAGS[0], newValue: boolean) => {
    if (flag.dangerous) {
      setConfirmDialog({ open: true, flag, newValue });
    } else {
      applyToggle(flag.key, newValue);
    }
  };

  const applyToggle = (flagKey: string, newValue: boolean) => {
    const scope = selectedResort;
    setFlagStates(prev => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        [flagKey]: newValue,
      },
    }));
    toast.success(`Feature flag updated`);
  };

  const confirmToggle = () => {
    if (confirmDialog.flag) {
      applyToggle(confirmDialog.flag.key, confirmDialog.newValue);
    }
    setConfirmDialog({ open: false, flag: null, newValue: false });
  };

  const getFlagState = (flagKey: string) => {
    const scope = selectedResort;
    if (scope !== 'global' && flagStates[scope]?.[flagKey] !== undefined) {
      return flagStates[scope][flagKey];
    }
    return flagStates.global?.[flagKey] ?? false;
  };

  const hasOverride = (flagKey: string) => {
    return selectedResort !== 'global' && flagStates[selectedResort]?.[flagKey] !== undefined;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ToggleRight className="h-7 w-7 text-primary" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground mt-1">
            Control features globally or per-resort
          </p>
        </div>
      </div>

      {/* Scope Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedResort} onValueChange={setSelectedResort}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Global (All Resorts)
                  </div>
                </SelectItem>
                <Separator className="my-1" />
                {resorts.map(resort => (
                  <SelectItem key={resort.id} value={resort.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {resort.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      {selectedResort !== 'global' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-info/10 border border-info/30">
          <Info className="h-5 w-5 text-info mt-0.5" />
          <div>
            <p className="font-medium text-sm">Resort Override Mode</p>
            <p className="text-xs text-muted-foreground">
              Changes here will only affect {resorts.find(r => r.id === selectedResort)?.name}. 
              Flags inherit from global settings unless overridden.
            </p>
          </div>
        </div>
      )}

      {/* Feature Flag Groups */}
      <div className="space-y-6">
        {groupedFlags.map(group => {
          const IconComponent = group.icon;
          const isDanger = group.key === 'danger';
          
          return (
            <Card key={group.key} className={isDanger ? 'border-destructive/50' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 ${group.color}`}>
                  <IconComponent className="h-5 w-5" />
                  {group.label}
                </CardTitle>
                {isDanger && (
                  <CardDescription className="text-destructive">
                    These flags can significantly impact platform availability. Use with extreme caution.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.flags.map(flag => {
                    const isEnabled = getFlagState(flag.key);
                    const isOverridden = hasOverride(flag.key);
                    
                    return (
                      <div
                        key={flag.key}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          isDanger ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border/50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{flag.label}</span>
                            {flag.tier && (
                              <Badge variant="outline" className="text-[9px] capitalize">
                                {flag.tier}
                              </Badge>
                            )}
                            {isOverridden && (
                              <Badge variant="outline" className="text-[9px] bg-info/10 text-info border-info/30">
                                Override
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggle(flag, checked)}
                          className={isDanger ? 'data-[state=checked]:bg-destructive' : ''}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, flag: null, newValue: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {confirmDialog.newValue ? 'Enable' : 'Disable'} Dangerous Feature
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You are about to {confirmDialog.newValue ? 'enable' : 'disable'}{' '}
                <strong>{confirmDialog.flag?.label}</strong>.
              </p>
              <p className="text-destructive font-medium">
                {confirmDialog.flag?.description}
              </p>
              <p>This action may significantly impact platform availability. Are you sure?</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, flag: null, newValue: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmToggle}>
              Yes, {confirmDialog.newValue ? 'Enable' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
