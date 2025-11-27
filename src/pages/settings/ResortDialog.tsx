import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resort } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Copy, ExternalLink } from 'lucide-react';

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
    login_logo_url: '',
    login_hero_image_url: '',
    login_primary_color: '',
    login_accent_color: '',
    guest_login_title: '',
    guest_login_subtitle: '',
    guest_login_instructions: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (resort) {
      setFormData({
        name: resort.name,
        code: resort.code,
        timezone: resort.timezone,
        currency: resort.currency,
        login_logo_url: resort.login_logo_url || '',
        login_hero_image_url: resort.login_hero_image_url || '',
        login_primary_color: resort.login_primary_color || '',
        login_accent_color: resort.login_accent_color || '',
        guest_login_title: resort.guest_login_title || '',
        guest_login_subtitle: resort.guest_login_subtitle || '',
        guest_login_instructions: resort.guest_login_instructions || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        timezone: 'UTC',
        currency: 'USD',
        login_logo_url: '',
        login_hero_image_url: '',
        login_primary_color: '',
        login_accent_color: '',
        guest_login_title: '',
        guest_login_subtitle: '',
        guest_login_instructions: '',
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
      login_logo_url: formData.login_logo_url.trim() || null,
      login_hero_image_url: formData.login_hero_image_url.trim() || null,
      login_primary_color: formData.login_primary_color.trim() || null,
      login_accent_color: formData.login_accent_color.trim() || null,
      guest_login_title: formData.guest_login_title.trim() || null,
      guest_login_subtitle: formData.guest_login_subtitle.trim() || null,
      guest_login_instructions: formData.guest_login_instructions.trim() || null,
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

  const guestLoginUrl = formData.code ? `${window.location.origin}/resort/${formData.code}/guest/login` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(guestLoginUrl);
    toast({ title: 'Copied!', description: 'Guest login URL copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resort ? 'Edit Resort' : 'Add Resort'}</DialogTitle>
          <DialogDescription>
            {resort ? 'Update resort details and guest portal branding' : 'Create a new resort property'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="branding">Guest Portal</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Guest Login URL */}
              {resort && guestLoginUrl && (
                <div className="space-y-2 pt-2">
                  <Label>Guest Login URL</Label>
                  <div className="flex gap-2">
                    <Input value={guestLoginUrl} readOnly className="font-mono text-sm" />
                    <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" asChild>
                      <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this URL with guests via QR codes or emails</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Customize the appearance of your resort's guest portal login page. All fields are optional.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login_logo_url">Logo URL</Label>
                  <Input
                    id="login_logo_url"
                    value={formData.login_logo_url}
                    onChange={(e) => setFormData({ ...formData, login_logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">Resort logo for the login page</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login_hero_image_url">Hero Image URL</Label>
                  <Input
                    id="login_hero_image_url"
                    value={formData.login_hero_image_url}
                    onChange={(e) => setFormData({ ...formData, login_hero_image_url: e.target.value })}
                    placeholder="https://example.com/hero.jpg"
                  />
                  <p className="text-xs text-muted-foreground">Background image for the login page</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login_primary_color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="login_primary_color"
                      value={formData.login_primary_color}
                      onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                      placeholder="#0E7490"
                      className="flex-1"
                    />
                    {formData.login_primary_color && (
                      <div 
                        className="w-10 h-10 rounded-md border border-border" 
                        style={{ backgroundColor: formData.login_primary_color }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Override button colors (hex, e.g. #0E7490)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login_accent_color">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="login_accent_color"
                      value={formData.login_accent_color}
                      onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                      placeholder="#D8C7A6"
                      className="flex-1"
                    />
                    {formData.login_accent_color && (
                      <div 
                        className="w-10 h-10 rounded-md border border-border" 
                        style={{ backgroundColor: formData.login_accent_color }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Secondary accent color (hex)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_login_title">Login Title</Label>
                <Input
                  id="guest_login_title"
                  value={formData.guest_login_title}
                  onChange={(e) => setFormData({ ...formData, guest_login_title: e.target.value })}
                  placeholder="Welcome to Paradise Island"
                />
                <p className="text-xs text-muted-foreground">Custom welcome title on the login page</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_login_subtitle">Login Subtitle</Label>
                <Input
                  id="guest_login_subtitle"
                  value={formData.guest_login_subtitle}
                  onChange={(e) => setFormData({ ...formData, guest_login_subtitle: e.target.value })}
                  placeholder="Access your resort experience"
                />
                <p className="text-xs text-muted-foreground">Short description under the title</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_login_instructions">Login Instructions</Label>
                <Textarea
                  id="guest_login_instructions"
                  value={formData.guest_login_instructions}
                  onChange={(e) => setFormData({ ...formData, guest_login_instructions: e.target.value })}
                  placeholder="Use your room number and the last name on your reservation to log in. Your PIN was provided at check-in."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Help text shown below the login form</p>
              </div>
            </TabsContent>
          </Tabs>

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
