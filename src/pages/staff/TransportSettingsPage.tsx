import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { 
  useTransportSettings, 
  useUpdateTransportSettings,
  useResetTransportSettings,
  TransportSettingsInput,
  DEFAULT_TRANSPORT_SETTINGS,
} from '@/hooks/transport/useTransportSettings';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Car, 
  Clock, 
  Users, 
  MapPin, 
  Bell, 
  Gauge,
  Route,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Helper badge for recommended settings
function RecommendedBadge() {
  return (
    <Badge variant="secondary" className="ml-2 text-xs font-normal gap-1">
      <Sparkles className="h-3 w-3" />
      Recommended
    </Badge>
  );
}

// Helper text component
function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1.5">{children}</p>;
}

// Section card wrapper
function SettingsSection({ 
  icon: Icon, 
  title, 
  description, 
  children 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

// Toggle row for settings
function ToggleRow({ 
  label, 
  description, 
  checked, 
  onCheckedChange,
  recommended,
  disabled,
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void;
  recommended?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-1">
          <Label className="text-sm font-medium">{label}</Label>
          {recommended && <RecommendedBadge />}
        </div>
        <HelperText>{description}</HelperText>
      </div>
      <Switch 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}

// Number input with validation
function NumberInputRow({
  label,
  description,
  value,
  onChange,
  min,
  max,
  suffix,
  recommended,
  error,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
  recommended?: number;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center flex-wrap gap-1">
        <Label className="text-sm font-medium">{label}</Label>
        {recommended !== undefined && value === recommended && <RecommendedBadge />}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          className={cn(
            "w-24 text-base",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <HelperText>{description}</HelperText>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Slider row for settings
function SliderRow({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  recommended,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  recommended?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-wrap gap-1">
          <Label className="text-sm font-medium">{label}</Label>
          {recommended !== undefined && value === recommended && <RecommendedBadge />}
        </div>
        <span className="text-sm font-medium tabular-nums">
          {value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step || 1}
        className="w-full"
      />
      <HelperText>{description}</HelperText>
    </div>
  );
}

export default function TransportSettingsPage() {
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  
  // Access control
  const { isSuperAdmin, currentResortRole, permissionsLoading } = usePermissions();
  const canAccess = isSuperAdmin || 
    currentResortRole === 'TRANSPORT' || 
    currentResortRole === 'MANAGER' || 
    currentResortRole === 'RESORT_ADMIN';
  
  // Feature flag
  const transportEnabled = useFeatureEnabled('enable_transport');
  
  // Data
  const { data: settings, isLoading: settingsLoading } = useTransportSettings(resortId);
  const updateMutation = useUpdateTransportSettings(resortId);
  const resetMutation = useResetTransportSettings(resortId);
  
  // Form state
  const [formData, setFormData] = useState<TransportSettingsInput>(DEFAULT_TRANSPORT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        service_enabled: settings.service_enabled,
        guest_booking_enabled: settings.guest_booking_enabled,
        service_hours: settings.service_hours,
        pooling_enabled: settings.pooling_enabled,
        pooling_window_minutes: settings.pooling_window_minutes,
        max_stops_per_trip: settings.max_stops_per_trip,
        max_pickup_detour_meters: settings.max_pickup_detour_meters,
        max_wait_minutes: settings.max_wait_minutes,
        max_party_size: settings.max_party_size,
        location_required: settings.location_required,
        gps_throttle_seconds: settings.gps_throttle_seconds,
        presence_interval_seconds: settings.presence_interval_seconds,
        notify_guest_on_assigned: settings.notify_guest_on_assigned,
        notify_guest_on_driver_en_route: settings.notify_guest_on_driver_en_route,
        notify_guest_on_arrived: settings.notify_guest_on_arrived,
        notify_guest_eta_minutes: settings.notify_guest_eta_minutes,
      });
      setHasChanges(false);
    }
  }, [settings]);
  
  // Update a field
  const updateField = useCallback(<K extends keyof TransportSettingsInput>(
    field: K, 
    value: TransportSettingsInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error when field changes
    setErrors(prev => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);
  
  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.pooling_window_minutes! < 1 || formData.pooling_window_minutes! > 60) {
      newErrors.pooling_window_minutes = 'Must be between 1 and 60 minutes';
    }
    if (formData.max_stops_per_trip! < 2 || formData.max_stops_per_trip! > 20) {
      newErrors.max_stops_per_trip = 'Must be between 2 and 20 stops';
    }
    if (formData.max_wait_minutes! < 1 || formData.max_wait_minutes! > 60) {
      newErrors.max_wait_minutes = 'Must be between 1 and 60 minutes';
    }
    if (formData.max_party_size! < 1 || formData.max_party_size! > 20) {
      newErrors.max_party_size = 'Must be between 1 and 20 guests';
    }
    if (formData.gps_throttle_seconds! < 1 || formData.gps_throttle_seconds! > 60) {
      newErrors.gps_throttle_seconds = 'Must be between 1 and 60 seconds';
    }
    if (formData.presence_interval_seconds! < 10 || formData.presence_interval_seconds! > 300) {
      newErrors.presence_interval_seconds = 'Must be between 10 and 300 seconds';
    }
    if (formData.notify_guest_eta_minutes! < 1 || formData.notify_guest_eta_minutes! > 30) {
      newErrors.notify_guest_eta_minutes = 'Must be between 1 and 30 minutes';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  // Save handler
  const handleSave = useCallback(() => {
    if (!validate()) return;
    updateMutation.mutate(formData);
    setHasChanges(false);
  }, [formData, validate, updateMutation]);
  
  // Reset handler
  const handleReset = useCallback(() => {
    resetMutation.mutate();
    setHasChanges(false);
  }, [resetMutation]);
  
  // Loading state
  const isLoading = permissionsLoading || settingsLoading;
  const isSaving = updateMutation.isPending || resetMutation.isPending;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Access denied
  if (!canAccess) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Transport Settings" />
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Access Denied</h3>
                <p className="text-muted-foreground">
                  You don't have permission to access transport settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Feature disabled
  if (!transportEnabled) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Transport Settings" />
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Car className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Transport Module Disabled</h3>
                <p className="text-muted-foreground max-w-md">
                  The transport module is not enabled for this resort. 
                  Contact your administrator to enable transport features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 pb-24 lg:pb-6 animate-fade-in">
      <PageHeader
        title="Transport Settings"
        description="Configure buggy service rules, driver operations, and guest notifications"
      />
      
      {/* Availability */}
      <SettingsSection
        icon={Clock}
        title="Availability"
        description="Control when the transport service is active"
      >
        <ToggleRow
          label="Service Enabled"
          description="Master switch to enable or disable the entire transport service"
          checked={formData.service_enabled ?? true}
          onCheckedChange={(v) => updateField('service_enabled', v)}
          recommended
        />
      </SettingsSection>
      
      {/* Guest Experience */}
      <SettingsSection
        icon={Users}
        title="Guest Experience"
        description="Control how guests interact with the transport service"
      >
        <ToggleRow
          label="Guest Booking"
          description="Allow guests to request rides directly from the Guest Portal"
          checked={formData.guest_booking_enabled ?? true}
          onCheckedChange={(v) => updateField('guest_booking_enabled', v)}
          recommended
        />
        <Separator />
        <NumberInputRow
          label="Maximum Party Size"
          description="Maximum number of passengers allowed per ride request"
          value={formData.max_party_size ?? 6}
          onChange={(v) => updateField('max_party_size', v)}
          min={1}
          max={20}
          suffix="guests"
          recommended={6}
          error={errors.max_party_size}
        />
      </SettingsSection>
      
      {/* Pooling Rules */}
      <SettingsSection
        icon={Route}
        title="Pooling Rules"
        description="Configure how ride requests are grouped into trips"
      >
        <ToggleRow
          label="Pooling Enabled"
          description="Combine multiple ride requests into single trips for efficiency"
          checked={formData.pooling_enabled ?? true}
          onCheckedChange={(v) => updateField('pooling_enabled', v)}
          recommended
        />
        <Separator />
        <SliderRow
          label="Pooling Window"
          description="Time window to wait for additional requests before dispatching a trip"
          value={formData.pooling_window_minutes ?? 10}
          onChange={(v) => updateField('pooling_window_minutes', v)}
          min={1}
          max={60}
          suffix=" min"
          recommended={10}
        />
        <NumberInputRow
          label="Max Stops per Trip"
          description="Maximum number of pickup/dropoff stops allowed in a single pooled trip"
          value={formData.max_stops_per_trip ?? 6}
          onChange={(v) => updateField('max_stops_per_trip', v)}
          min={2}
          max={20}
          suffix="stops"
          recommended={6}
          error={errors.max_stops_per_trip}
        />
        <SliderRow
          label="Max Pickup Detour"
          description="Maximum additional distance allowed for pooled pickups"
          value={formData.max_pickup_detour_meters ?? 500}
          onChange={(v) => updateField('max_pickup_detour_meters', v)}
          min={0}
          max={5000}
          step={50}
          suffix="m"
          recommended={500}
        />
        <SliderRow
          label="Max Guest Wait Time"
          description="Maximum time a guest should wait for their pickup"
          value={formData.max_wait_minutes ?? 15}
          onChange={(v) => updateField('max_wait_minutes', v)}
          min={1}
          max={60}
          suffix=" min"
          recommended={15}
        />
      </SettingsSection>
      
      {/* Driver Operations */}
      <SettingsSection
        icon={Gauge}
        title="Driver Operations"
        description="Configure driver app behavior and location tracking"
      >
        <ToggleRow
          label="Location Required"
          description="Require drivers to share GPS location while on duty"
          checked={formData.location_required ?? false}
          onCheckedChange={(v) => updateField('location_required', v)}
        />
        <Separator />
        <SliderRow
          label="GPS Update Interval"
          description="How often to transmit driver location updates"
          value={formData.gps_throttle_seconds ?? 5}
          onChange={(v) => updateField('gps_throttle_seconds', v)}
          min={1}
          max={60}
          suffix="s"
          recommended={5}
        />
        <SliderRow
          label="Presence Heartbeat"
          description="Interval for driver presence/availability check-ins"
          value={formData.presence_interval_seconds ?? 30}
          onChange={(v) => updateField('presence_interval_seconds', v)}
          min={10}
          max={300}
          step={5}
          suffix="s"
          recommended={30}
        />
      </SettingsSection>
      
      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Guest Notifications"
        description="Configure when guests receive ride status updates"
      >
        <ToggleRow
          label="Notify on Assignment"
          description="Send notification when a driver is assigned to the guest's request"
          checked={formData.notify_guest_on_assigned ?? true}
          onCheckedChange={(v) => updateField('notify_guest_on_assigned', v)}
          recommended
        />
        <ToggleRow
          label="Notify Driver En Route"
          description="Send notification when the driver starts heading to pickup"
          checked={formData.notify_guest_on_driver_en_route ?? true}
          onCheckedChange={(v) => updateField('notify_guest_on_driver_en_route', v)}
          recommended
        />
        <ToggleRow
          label="Notify on Arrival"
          description="Send notification when the driver arrives at the pickup location"
          checked={formData.notify_guest_on_arrived ?? true}
          onCheckedChange={(v) => updateField('notify_guest_on_arrived', v)}
          recommended
        />
        <Separator />
        <SliderRow
          label="ETA Notification Threshold"
          description="Send approaching notification when ETA is below this threshold"
          value={formData.notify_guest_eta_minutes ?? 5}
          onChange={(v) => updateField('notify_guest_eta_minutes', v)}
          min={1}
          max={30}
          suffix=" min"
          recommended={5}
        />
      </SettingsSection>
      
      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions that affect the transport service</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p className="font-medium text-sm">Reset to Defaults</p>
              <p className="text-xs text-muted-foreground">
                Restore all transport settings to their default values
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Settings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Transport Settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore all transport settings to their default values. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Reset to Defaults
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      
      {/* Sticky Save Bar (Mobile) */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "border-t px-4 py-3 safe-area-bottom",
        "transition-transform duration-200",
        hasChanges ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-muted-foreground">Unsaved changes</span>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
      
      {/* Desktop Save Button */}
      <div className="hidden lg:flex justify-end gap-4">
        {hasChanges && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Unsaved changes
          </div>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="min-w-[140px]"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
