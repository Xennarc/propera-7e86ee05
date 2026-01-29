import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  FileCheck, 
  Building2, 
  User, 
  Palette, 
  Loader2, 
  Check, 
  Copy, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WizardData } from '../CreateResortWizard';
import { COLOR_PRESETS } from './QuickBrandingStep';

interface ReviewStepProps {
  data: WizardData;
  onBack: () => void;
  onSuccess: (success: WizardData['success']) => void;
  onClose: () => void;
  onReset: () => void;
}

export function ReviewStep({ data, onBack, onSuccess, onClose, onReset }: ReviewStepProps) {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'link' | 'password' | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);

  const selectedPreset = COLOR_PRESETS.find(p => p.id === data.colorPreset);

  const copyToClipboard = async (text: string, type: 'link' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type === 'link' ? 'Link' : 'Password'} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async () => {
    if (!user || !session) return;

    setLoading(true);
    try {
      // Build resort insert data
      const insertData = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        timezone: data.timezone,
        currency: data.currency,
        status: 'ACTIVE' as const,
        is_demo: false,
        onboarding_status: 'NOT_STARTED' as const,
        onboarding_basics_done: false,
        onboarding_activities_done: false,
        onboarding_restaurants_done: false,
        onboarding_staff_done: false,
        onboarding_portal_done: false,
        onboarding_branding_done: false,
        onboarding_prearrival_done: false,
        // Apply color preset if selected
        ...(selectedPreset && {
          login_primary_color: selectedPreset.primary,
          login_accent_color: selectedPreset.accent,
        }),
      };

      const { data: resort, error: resortError } = await supabase
        .from('resorts')
        .insert(insertData)
        .select()
        .single();

      if (resortError) {
        if (resortError.message.includes('duplicate')) {
          toast.error('A resort with this code already exists');
        } else {
          toast.error(resortError.message);
        }
        setLoading(false);
        return;
      }

      // 2. Bootstrap the Resort Admin via edge function
      const { data: bootstrapResult, error: bootstrapError } = await supabase.functions.invoke(
        'bootstrap-resort-admin',
        {
          body: {
            resortId: resort.id,
            resortName: data.name.trim(),
            resortCode: data.code.trim().toUpperCase(),
            adminEmail: data.adminEmail.trim().toLowerCase(),
            adminUsername: data.adminUsername.trim().toLowerCase(),
            adminFullName: data.adminFullName.trim(),
          },
        }
      );

      if (bootstrapError || !bootstrapResult?.success) {
        console.error('Bootstrap error:', bootstrapError || bootstrapResult);
        // Resort was created but admin failed - delete the resort to avoid orphan
        await supabase.from('resorts').delete().eq('id', resort.id);
        toast.error(bootstrapResult?.error || 'Failed to create admin account. Resort creation rolled back.');
        setLoading(false);
        return;
      }

      const successData = {
        resortName: data.name,
        resortCode: data.code.toUpperCase(),
        adminEmail: data.adminEmail,
        adminUsername: bootstrapResult.username,
        emailSent: bootstrapResult.email_sent,
        tempPassword: bootstrapResult.temp_password || undefined,
        signInLink: bootstrapResult.sign_in_link,
      };

      onSuccess(successData);
      toast.success('Resort and admin account created successfully!');
    } catch (error) {
      console.error('Error creating resort:', error);
      toast.error('Failed to create resort');
    } finally {
      setLoading(false);
    }
  };

  // Show success state
  if (data.success) {
    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="flex items-center gap-4 p-5 bg-success/10 border border-success/20 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-success">Resort Created Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              {data.success.resortName} ({data.success.resortCode}) is ready for setup
            </p>
          </div>
        </div>

        {/* Email Status */}
        {data.success.emailSent ? (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Welcome Email Sent</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Login credentials have been emailed to <strong>{data.success.adminEmail}</strong>.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-sm">Email Failed to Send</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Please share these credentials manually. <strong>Copy now—you won't see this password again.</strong>
            </p>
            
            {data.success.tempPassword && (
              <div className="space-y-2 p-3 bg-background rounded-md border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Username</span>
                  <code className="text-sm font-mono">{data.success.adminUsername}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Temporary Password</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">
                      {showTempPassword ? data.success.tempPassword : '••••••••••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowTempPassword(!showTempPassword)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(data.success!.tempPassword!, 'password')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copied === 'password' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign-in Link */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <p className="text-sm font-medium">Sign-in Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background p-2 rounded border truncate">
              {data.success.signInLink}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(data.success!.signInLink, 'link')}
            >
              {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onReset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Create Another
          </Button>
          <Button onClick={onClose} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Review state (before creation)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <FileCheck className="h-5 w-5 text-primary" />
          Review & Create
        </h2>
        <p className="text-muted-foreground text-sm">
          Please review the details below before creating the resort.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Resort Details */}
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Resort Details</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-medium">{data.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Code</span>
              <p className="font-mono font-medium">{data.code.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Timezone</span>
              <p className="font-medium">{data.timezone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Currency</span>
              <p className="font-medium">{data.currency}</p>
            </div>
          </div>
        </div>

        {/* Admin Details */}
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Resort Admin</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-medium">{data.adminFullName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Username</span>
              <p className="font-mono font-medium">{data.adminUsername}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{data.adminEmail}</p>
            </div>
          </div>
        </div>

        {/* Branding */}
        {selectedPreset && (
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Branding Preset</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: selectedPreset.primary }}
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: selectedPreset.accent }}
                />
              </div>
              <span className="text-sm">{selectedPreset.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleCreate} disabled={loading} size="lg" className="px-8">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Resort
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
