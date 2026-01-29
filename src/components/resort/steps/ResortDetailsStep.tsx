import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Globe, Coins, FileText } from 'lucide-react';
import type { WizardData } from '../CreateResortWizard';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Honolulu',
  'Indian/Maldives',
];

const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'AED', 'MVR', 'THB', 'JPY'];

interface ResortDetailsStepProps {
  data: WizardData;
  setField: (field: keyof WizardData, value: string | null) => void;
  onValidChange: (valid: boolean) => void;
}

export function ResortDetailsStep({ data, setField, onValidChange }: ResortDetailsStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Auto-generate code from name
  useEffect(() => {
    if (data.name && !touched.code) {
      const generatedCode = data.name
        .split(' ')
        .map(w => w.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 5);
      if (generatedCode.length >= 2) {
        setField('code', generatedCode);
      }
    }
  }, [data.name, touched.code, setField]);

  // Validation
  useEffect(() => {
    const isValid =
      data.name.trim().length >= 2 &&
      data.code.trim().length >= 2 &&
      data.code.trim().length <= 10 &&
      data.timezone.length > 0 &&
      data.currency.length === 3;
    onValidChange(isValid);
  }, [data.name, data.code, data.timezone, data.currency, onValidChange]);

  const getError = (field: string): string | null => {
    if (!touched[field]) return null;
    switch (field) {
      case 'name':
        return data.name.trim().length < 2 ? 'Name must be at least 2 characters' : null;
      case 'code':
        if (data.code.trim().length < 2) return 'Code must be at least 2 characters';
        if (data.code.trim().length > 10) return 'Code must be at most 10 characters';
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Building2 className="h-5 w-5 text-primary" />
          Resort Details
        </h2>
        <p className="text-muted-foreground text-sm">
          Let's set up your new resort property. You can always update these later.
        </p>
      </div>

      <div className="grid gap-5">
        {/* Resort Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Resort Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => setTouched(p => ({ ...p, name: true }))}
            placeholder="Paradise Island Resort"
            className="text-base"
          />
          {getError('name') && (
            <p className="text-sm text-destructive">{getError('name')}</p>
          )}
        </div>

        {/* Resort Code */}
        <div className="space-y-2">
          <Label htmlFor="code" className="flex items-center gap-1.5">
            Resort Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="code"
            value={data.code}
            onChange={(e) => {
              setTouched(p => ({ ...p, code: true }));
              setField('code', e.target.value.toUpperCase());
            }}
            onBlur={() => setTouched(p => ({ ...p, code: true }))}
            placeholder="PIR"
            maxLength={10}
            className="font-mono uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Short unique code used in URLs (2-10 characters)
          </p>
          {getError('code') && (
            <p className="text-sm text-destructive">{getError('code')}</p>
          )}
        </div>

        {/* Timezone & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.timezone}
              onValueChange={(value) => setField('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency" className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              Currency <span className="text-destructive">*</span>
            </Label>
            <Select
              value={data.currency}
              onValueChange={(value) => setField('currency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Description <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="A luxury beachfront resort with world-class amenities..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
