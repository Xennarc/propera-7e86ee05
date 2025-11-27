import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resort } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const resortSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be at most 10 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
});

interface ResortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resort: Resort | null;
  onSuccess: () => void;
}

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

export function ResortDialog({ open, onOpenChange, resort, onSuccess }: ResortDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    timezone: 'UTC',
    currency: 'USD',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (resort) {
      setFormData({
        name: resort.name,
        code: resort.code,
        timezone: resort.timezone,
        currency: resort.currency,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        timezone: 'UTC',
        currency: 'USD',
      });
    }
    setErrors({});
  }, [resort, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = resortSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const resortData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      timezone: formData.timezone,
      currency: formData.currency,
    };

    let error;
    if (resort) {
      const { error: updateError } = await supabase
        .from('resorts')
        .update(resortData)
        .eq('id', resort.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('resorts')
        .insert(resortData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      if (error.message.includes('duplicate')) {
        toast({ variant: 'destructive', title: 'Error', description: 'A resort with this code already exists' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    } else {
      toast({ title: 'Success', description: resort ? 'Resort updated' : 'Resort added' });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{resort ? 'Edit Resort' : 'Add Resort'}</DialogTitle>
          <DialogDescription>
            {resort ? 'Update resort details' : 'Create a new resort property'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Paradise Island Resort"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="PIR"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Short unique code (2-10 characters)</p>
            {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone *</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
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
            {errors.timezone && <p className="text-sm text-destructive">{errors.timezone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
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
            {errors.currency && <p className="text-sm text-destructive">{errors.currency}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : resort ? 'Update Resort' : 'Add Resort'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
