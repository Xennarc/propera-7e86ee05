import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, AtSign, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { WizardData } from '../CreateResortWizard';

interface AdminSetupStepProps {
  data: WizardData;
  setField: (field: keyof WizardData, value: string | null) => void;
  onValidChange: (valid: boolean) => void;
}

export function AdminSetupStep({ data, setField, onValidChange }: AdminSetupStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const debouncedUsername = useDebounce(data.adminUsername, 500);

  // Auto-generate username from admin name
  useEffect(() => {
    if (data.adminFullName && !touched.adminUsername && !data.adminUsername) {
      const suggested = data.adminFullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '')
        .slice(0, 24);
      if (suggested.length >= 3) {
        setField('adminUsername', suggested);
      }
    }
  }, [data.adminFullName, data.adminUsername, touched.adminUsername, setField]);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      if (!/^[a-z0-9._]+$/.test(debouncedUsername)) {
        setUsernameAvailable(null);
        return;
      }

      setUsernameChecking(true);
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', debouncedUsername)
          .maybeSingle();

        setUsernameAvailable(existingProfile === null);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    };

    checkUsername();
  }, [debouncedUsername]);

  // Validation
  useEffect(() => {
    const nameValid = data.adminFullName.trim().length >= 2;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail);
    const usernameValid =
      data.adminUsername.length >= 3 &&
      data.adminUsername.length <= 24 &&
      /^[a-z0-9._]+$/.test(data.adminUsername) &&
      usernameAvailable !== false;

    onValidChange(nameValid && emailValid && usernameValid);
  }, [data.adminFullName, data.adminEmail, data.adminUsername, usernameAvailable, onValidChange]);

  const getError = (field: string): string | null => {
    if (!touched[field]) return null;
    switch (field) {
      case 'adminFullName':
        return data.adminFullName.trim().length < 2 ? 'Name must be at least 2 characters' : null;
      case 'adminEmail':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)
          ? 'Please enter a valid email'
          : null;
      case 'adminUsername':
        if (data.adminUsername.length < 3) return 'Username must be at least 3 characters';
        if (data.adminUsername.length > 24) return 'Username must be at most 24 characters';
        if (!/^[a-z0-9._]+$/.test(data.adminUsername))
          return 'Only lowercase letters, numbers, dots, and underscores';
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-primary" />
          Primary Resort Admin
        </h2>
        <p className="text-muted-foreground text-sm">
          This person will receive login credentials and have full admin access to the resort.
        </p>
      </div>

      <div className="grid gap-5">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="adminFullName" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="adminFullName"
            value={data.adminFullName}
            onChange={(e) => setField('adminFullName', e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, adminFullName: true }))}
            placeholder="John Smith"
            className="text-base"
          />
          {getError('adminFullName') && (
            <p className="text-sm text-destructive">{getError('adminFullName')}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="adminEmail" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="adminEmail"
            type="email"
            value={data.adminEmail}
            onChange={(e) => setField('adminEmail', e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, adminEmail: true }))}
            placeholder="admin@resort.com"
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            Login credentials will be sent to this email
          </p>
          {getError('adminEmail') && (
            <p className="text-sm text-destructive">{getError('adminEmail')}</p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="adminUsername" className="flex items-center gap-1.5">
            <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
            Username <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="adminUsername"
              value={data.adminUsername}
              onChange={(e) => {
                setTouched(p => ({ ...p, adminUsername: true }));
                setField('adminUsername', e.target.value.toLowerCase());
              }}
              onBlur={() => setTouched(p => ({ ...p, adminUsername: true }))}
              placeholder="john.smith"
              className={cn(
                'pr-10',
                usernameAvailable === false && 'border-destructive focus-visible:ring-destructive/20',
                usernameAvailable === true && 'border-success focus-visible:ring-success/20'
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!usernameChecking && usernameAvailable === true && (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              {!usernameChecking && usernameAvailable === false && (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            3-24 characters: lowercase letters, numbers, dots, underscores
          </p>
          {getError('adminUsername') && (
            <p className="text-sm text-destructive">{getError('adminUsername')}</p>
          )}
          {usernameAvailable === false && !getError('adminUsername') && (
            <p className="text-sm text-destructive">Username is already taken</p>
          )}
        </div>
      </div>
    </div>
  );
}
