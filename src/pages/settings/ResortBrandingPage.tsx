import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { Palette, ExternalLink, Image, Type, Save, Shield, RotateCcw, Sun, Moon, Monitor } from 'lucide-react';
import { BrandingPreview } from '@/components/branding/BrandingPreview';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'LIGHT', label: 'Light', icon: Sun },
  { value: 'DARK', label: 'Dark', icon: Moon },
  { value: 'AUTO', label: 'Auto', icon: Monitor },
];

const DEFAULT_PRIMARY = '#0E7490';
const DEFAULT_ACCENT = '#D8C7A6';

export default function ResortBrandingPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort, refetch } = useResort();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    login_logo_url: '',
    login_hero_image_url: '',
    login_primary_color: '',
    login_accent_color: '',
    guest_login_title: '',
    guest_login_subtitle: '',
    guest_login_instructions: '',
    brand_theme: 'LIGHT',
    brand_wordmark: '',
  });

  const canAccess = currentResort && (isSuperAdmin() || getResortRole(currentResort.id) === 'RESORT_ADMIN');

  useEffect(() => {
    if (currentResort) {
      fetchBranding();
    }
  }, [currentResort]);

  const fetchBranding = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resorts')
        .select('login_logo_url, login_hero_image_url, login_primary_color, login_accent_color, guest_login_title, guest_login_subtitle, guest_login_instructions, brand_theme, brand_wordmark')
        .eq('id', currentResort.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          login_logo_url: data.login_logo_url || '',
          login_hero_image_url: data.login_hero_image_url || '',
          login_primary_color: data.login_primary_color || '',
          login_accent_color: data.login_accent_color || '',
          guest_login_title: data.guest_login_title || '',
          guest_login_subtitle: data.guest_login_subtitle || '',
          guest_login_instructions: data.guest_login_instructions || '',
          brand_theme: data.brand_theme || 'LIGHT',
          brand_wordmark: data.brand_wordmark || '',
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentResort) return;

    // Validate hex colors if provided
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (formData.login_primary_color && !hexRegex.test(formData.login_primary_color)) {
      toast.error('Invalid primary color format. Use hex format (e.g., #0E7490)');
      return;
    }
    if (formData.login_accent_color && !hexRegex.test(formData.login_accent_color)) {
      toast.error('Invalid accent color format. Use hex format (e.g., #D8C7A6)');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('resorts')
        .update({
          login_logo_url: formData.login_logo_url.trim() || null,
          login_hero_image_url: formData.login_hero_image_url.trim() || null,
          login_primary_color: formData.login_primary_color.trim() || null,
          login_accent_color: formData.login_accent_color.trim() || null,
          guest_login_title: formData.guest_login_title.trim() || null,
          guest_login_subtitle: formData.guest_login_subtitle.trim() || null,
          guest_login_instructions: formData.guest_login_instructions.trim() || null,
          brand_theme: formData.brand_theme || 'LIGHT',
          brand_wordmark: formData.brand_wordmark.trim() || null,
          onboarding_portal_done: true,
        })
        .eq('id', currentResort.id);

      if (error) throw error;

      // Update onboarding status if needed
      const hasBranding = formData.login_logo_url || formData.login_primary_color || formData.login_accent_color;
      if (hasBranding) {
        await supabase
          .from('resorts')
          .update({ onboarding_status: 'IN_PROGRESS' })
          .eq('id', currentResort.id)
          .eq('onboarding_status', 'NOT_STARTED');
      }

      await refetch();
      toast.success('Branding updated. Changes will be visible in the guest portal.');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      login_logo_url: '',
      login_hero_image_url: '',
      login_primary_color: '',
      login_accent_color: '',
      guest_login_title: '',
      guest_login_subtitle: '',
      guest_login_instructions: '',
      brand_theme: 'LIGHT',
      brand_wordmark: '',
    });
    toast.info('Form reset to defaults. Click Save to apply changes.');
  };

  const guestLoginUrl = currentResort ? `${window.location.origin}/resort/${currentResort.code}/guest/login` : '';

  if (!currentResort) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Palette}
          title="No Resort Selected"
          description="Please select a resort to manage branding"
        />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need Resort Admin privileges to manage branding"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Branding"
        description="Customize the look and feel of your resort's Propera portal"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form Panel - Left */}
        <div className="lg:col-span-3 space-y-6">
          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-5 w-5" />
                Logo & Images
              </CardTitle>
              <CardDescription>
                Upload your resort logo and background imagery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={formData.login_logo_url}
                  onChange={(e) => setFormData({ ...formData, login_logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  PNG or SVG recommended, at least 256×256px
                </p>
              </div>

              {formData.login_logo_url && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <img 
                    src={formData.login_logo_url} 
                    alt="Logo preview" 
                    className="h-16 w-16 object-contain rounded border bg-background"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Failed to load';
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current logo</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-auto p-0 mt-1"
                      onClick={() => setFormData({ ...formData, login_logo_url: '' })}
                    >
                      Remove logo
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="hero">Hero Image URL</Label>
                <Input
                  id="hero"
                  value={formData.login_hero_image_url}
                  onChange={(e) => setFormData({ ...formData, login_hero_image_url: e.target.value })}
                  placeholder="https://example.com/hero.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Background image for the login page (recommended: 1920×1080 or larger)
                </p>
              </div>

              {formData.login_hero_image_url && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <img 
                    src={formData.login_hero_image_url} 
                    alt="Hero preview" 
                    className="h-24 w-full object-cover rounded"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-auto p-0"
                    onClick={() => setFormData({ ...formData, login_hero_image_url: '' })}
                  >
                    Remove hero image
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Colors Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>
                Set your brand colors for buttons, accents, and highlights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primary">Primary color</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for buttons, highlights, and key accents
                </p>
                <div className="flex gap-2">
                  <Input
                    id="primary"
                    value={formData.login_primary_color}
                    onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                    placeholder={DEFAULT_PRIMARY}
                    className="flex-1 font-mono"
                  />
                  <input
                    type="color"
                    value={formData.login_primary_color || DEFAULT_PRIMARY}
                    onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                    className="w-14 h-10 rounded border border-input cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="accent">Accent color</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for secondary accents and backgrounds
                </p>
                <div className="flex gap-2">
                  <Input
                    id="accent"
                    value={formData.login_accent_color}
                    onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                    placeholder={DEFAULT_ACCENT}
                    className="flex-1 font-mono"
                  />
                  <input
                    type="color"
                    value={formData.login_accent_color || DEFAULT_ACCENT}
                    onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                    className="w-14 h-10 rounded border border-input cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sun className="h-5 w-5" />
                Theme Mode
              </CardTitle>
              <CardDescription>
                Choose the default theme for your guest portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, brand_theme: option.value })}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      formData.brand_theme === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <option.icon className={cn(
                      'h-5 w-5',
                      formData.brand_theme === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      formData.brand_theme === option.value ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Auto mode will match the guest's device preference
              </p>
            </CardContent>
          </Card>

          {/* Text Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-5 w-5" />
                Login Page Text
              </CardTitle>
              <CardDescription>
                Customize the welcome message on your guest login page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wordmark">Wordmark / Tagline</Label>
                <Input
                  id="wordmark"
                  value={formData.brand_wordmark}
                  onChange={(e) => setFormData({ ...formData, brand_wordmark: e.target.value })}
                  placeholder="e.g., Island Escape Collection"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Short text that appears next to your logo (max 50 characters)
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Login Title</Label>
                  <Input
                    id="title"
                    value={formData.guest_login_title}
                    onChange={(e) => setFormData({ ...formData, guest_login_title: e.target.value })}
                    placeholder="Welcome to Paradise Island"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.guest_login_subtitle}
                    onChange={(e) => setFormData({ ...formData, guest_login_subtitle: e.target.value })}
                    placeholder="Your island experience awaits"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Login Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.guest_login_instructions}
                  onChange={(e) => setFormData({ ...formData, guest_login_instructions: e.target.value })}
                  placeholder="Please enter your room number and the PIN provided at check-in to access the guest portal."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save branding'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to defaults
            </Button>
            <Button variant="outline" asChild className="sm:ml-auto">
              <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Login Page
              </a>
            </Button>
          </div>
        </div>

        {/* Preview Panel - Right */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardContent className="pt-6">
                <BrandingPreview
                  logoUrl={formData.login_logo_url}
                  primaryColor={formData.login_primary_color || DEFAULT_PRIMARY}
                  accentColor={formData.login_accent_color || DEFAULT_ACCENT}
                  theme={formData.brand_theme}
                  wordmark={formData.brand_wordmark}
                  resortName={currentResort.name}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
