import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useInvalidateResortBranding } from '@/hooks/useResortBranding';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Palette, ExternalLink, Image, Type, Save, Shield, RotateCcw, 
  Sun, Moon, Monitor, Eye, Sparkles, Check, AlertCircle, Copy
} from 'lucide-react';
import { BrandingPreview } from '@/components/branding/BrandingPreview';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'LIGHT', label: 'Light', icon: Sun, description: 'Clean, bright appearance' },
  { value: 'DARK', label: 'Dark', icon: Moon, description: 'Elegant, modern look' },
  { value: 'AUTO', label: 'Auto', icon: Monitor, description: 'Match guest device' },
];

const DEFAULT_PRIMARY = '#0E7490';
const DEFAULT_ACCENT = '#D8C7A6';

// Curated color presets for resorts
const COLOR_PRESETS = [
  { name: 'Ocean Teal', primary: '#0E7490', accent: '#D8C7A6', description: 'Default Propera theme' },
  { name: 'Tropical Sunset', primary: '#EA580C', accent: '#FCD34D', description: 'Warm, vibrant' },
  { name: 'Lagoon Blue', primary: '#0284C7', accent: '#A5F3FC', description: 'Fresh, aquatic' },
  { name: 'Forest Green', primary: '#059669', accent: '#D1FAE5', description: 'Natural, serene' },
  { name: 'Royal Purple', primary: '#7C3AED', accent: '#EDE9FE', description: 'Luxurious, bold' },
  { name: 'Coral Reef', primary: '#F43F5E', accent: '#FECDD3', description: 'Playful, energetic' },
  { name: 'Golden Sand', primary: '#B45309', accent: '#FEF3C7', description: 'Warm, earthy' },
  { name: 'Midnight Navy', primary: '#1E3A5F', accent: '#94A3B8', description: 'Classic, sophisticated' },
];

interface FormData {
  login_logo_url: string;
  login_hero_image_url: string;
  login_primary_color: string;
  login_accent_color: string;
  guest_login_title: string;
  guest_login_subtitle: string;
  guest_login_instructions: string;
  brand_theme: string;
  brand_wordmark: string;
}

const initialFormData: FormData = {
  login_logo_url: '',
  login_hero_image_url: '',
  login_primary_color: '',
  login_accent_color: '',
  guest_login_title: '',
  guest_login_subtitle: '',
  guest_login_instructions: '',
  brand_theme: 'LIGHT',
  brand_wordmark: '',
};

export default function ResortBrandingPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort, refetch } = useResort();
  const invalidateResortBranding = useInvalidateResortBranding();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [originalData, setOriginalData] = useState<FormData>(initialFormData);
  const [activeTab, setActiveTab] = useState('appearance');

  const canAccess = currentResort && (isSuperAdmin() || getResortRole(currentResort.id) === 'RESORT_ADMIN');
  
  // Track unsaved changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  useEffect(() => {
    if (currentResort) {
      fetchBranding();
    }
  }, [currentResort]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

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
        const loadedData: FormData = {
          login_logo_url: data.login_logo_url || '',
          login_hero_image_url: data.login_hero_image_url || '',
          login_primary_color: data.login_primary_color || '',
          login_accent_color: data.login_accent_color || '',
          guest_login_title: data.guest_login_title || '',
          guest_login_subtitle: data.guest_login_subtitle || '',
          guest_login_instructions: data.guest_login_instructions || '',
          brand_theme: data.brand_theme || 'LIGHT',
          brand_wordmark: data.brand_wordmark || '',
        };
        setFormData(loadedData);
        setOriginalData(loadedData);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const validateHexColor = (color: string): boolean => {
    if (!color) return true;
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  const handleSave = async () => {
    if (!currentResort) return;

    // Validate hex colors
    if (!validateHexColor(formData.login_primary_color)) {
      toast.error('Invalid primary color format. Use hex format (e.g., #0E7490)');
      return;
    }
    if (!validateHexColor(formData.login_accent_color)) {
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

      // Invalidate branding cache so guest portal sees changes immediately
      invalidateResortBranding(currentResort.id);
      
      // Update original data to reflect saved state
      setOriginalData(formData);
      
      await refetch();
      toast.success('Branding saved! Changes are now live in the guest portal.');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(originalData);
    toast.info('Changes discarded');
  };

  const handleResetToDefaults = () => {
    setFormData(initialFormData);
    toast.info('Reset to defaults. Click Save to apply.');
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      login_primary_color: preset.primary,
      login_accent_color: preset.accent,
    }));
    toast.success(`Applied "${preset.name}" color scheme`);
  };

  const copyGuestUrl = () => {
    if (currentResort) {
      navigator.clipboard.writeText(`${window.location.origin}/resort/${currentResort.code}/guest/login`);
      toast.success('Guest login URL copied to clipboard');
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Branding"
          description="Customize your guest portal appearance"
        />
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={copyGuestUrl}>
            <Copy className="h-4 w-4 mr-2" />
            Copy URL
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form Panel - Left */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Colors</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Images</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span className="hidden sm:inline">Content</span>
              </TabsTrigger>
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-6">
              {/* Color Presets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5" />
                    Color Presets
                  </CardTitle>
                  <CardDescription>
                    Choose a pre-designed color scheme or customize your own
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COLOR_PRESETS.map((preset) => {
                      const isActive = formData.login_primary_color === preset.primary && 
                                       formData.login_accent_color === preset.accent;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyColorPreset(preset)}
                          className={cn(
                            'relative flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left',
                            isActive
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <div
                              className="w-5 h-5 rounded-full border shadow-sm"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <div
                              className="w-5 h-5 rounded-full border shadow-sm"
                              style={{ backgroundColor: preset.accent }}
                            />
                            {isActive && (
                              <Check className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>
                          <span className="text-sm font-medium">{preset.name}</span>
                          <span className="text-xs text-muted-foreground">{preset.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="h-5 w-5" />
                    Custom Colors
                  </CardTitle>
                  <CardDescription>
                    Fine-tune your brand colors with hex values
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Primary Color */}
                  <div className="space-y-3">
                    <Label htmlFor="primary">Primary Color</Label>
                    <p className="text-xs text-muted-foreground">
                      Used for buttons, links, and key UI elements
                    </p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          id="primary"
                          value={formData.login_primary_color}
                          onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                          placeholder={DEFAULT_PRIMARY}
                          className={cn(
                            "font-mono pl-10",
                            formData.login_primary_color && !validateHexColor(formData.login_primary_color) && "border-destructive"
                          )}
                        />
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded border"
                          style={{ backgroundColor: formData.login_primary_color || DEFAULT_PRIMARY }}
                        />
                      </div>
                      <input
                        type="color"
                        value={formData.login_primary_color || DEFAULT_PRIMARY}
                        onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                        className="w-12 h-10 rounded border border-input cursor-pointer bg-transparent p-1"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-3">
                    <Label htmlFor="accent">Accent Color</Label>
                    <p className="text-xs text-muted-foreground">
                      Used for secondary elements and highlights
                    </p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          id="accent"
                          value={formData.login_accent_color}
                          onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                          placeholder={DEFAULT_ACCENT}
                          className={cn(
                            "font-mono pl-10",
                            formData.login_accent_color && !validateHexColor(formData.login_accent_color) && "border-destructive"
                          )}
                        />
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded border"
                          style={{ backgroundColor: formData.login_accent_color || DEFAULT_ACCENT }}
                        />
                      </div>
                      <input
                        type="color"
                        value={formData.login_accent_color || DEFAULT_ACCENT}
                        onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                        className="w-12 h-10 rounded border border-input cursor-pointer bg-transparent p-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Theme Mode */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sun className="h-5 w-5" />
                    Theme Mode
                  </CardTitle>
                  <CardDescription>
                    Set the default appearance for your guest portal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, brand_theme: option.value })}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                          formData.brand_theme === option.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <option.icon className={cn(
                          'h-6 w-6',
                          formData.brand_theme === option.value ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className={cn(
                          'text-sm font-medium',
                          formData.brand_theme === option.value ? 'text-primary' : 'text-foreground'
                        )}>
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground text-center">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Image className="h-5 w-5" />
                    Logo
                  </CardTitle>
                  <CardDescription>
                    Your resort logo appears in the portal header and login page
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
                      PNG or SVG recommended. Minimum size: 256×256 pixels.
                    </p>
                  </div>

                  {formData.login_logo_url && (
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                      <div className="h-16 w-16 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
                        <img 
                          src={formData.login_logo_url} 
                          alt="Logo preview" 
                          className="h-14 w-14 object-contain"
                          onError={(e) => {
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-destructive">Failed</span>';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Logo Preview</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {formData.login_logo_url}
                        </p>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Image className="h-5 w-5" />
                    Hero Background
                  </CardTitle>
                  <CardDescription>
                    Background image for the guest login page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hero">Hero Image URL</Label>
                    <Input
                      id="hero"
                      value={formData.login_hero_image_url}
                      onChange={(e) => setFormData({ ...formData, login_hero_image_url: e.target.value })}
                      placeholder="https://example.com/hero.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 1920×1080 pixels or larger. High-quality resort imagery works best.
                    </p>
                  </div>

                  {formData.login_hero_image_url && (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border">
                        <img 
                          src={formData.login_hero_image_url} 
                          alt="Hero preview" 
                          className="h-32 w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.parentElement!.innerHTML = '<div class="h-32 flex items-center justify-center bg-muted text-destructive text-sm">Failed to load image</div>';
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setFormData({ ...formData, login_hero_image_url: '' })}
                      >
                        Remove hero image
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Type className="h-5 w-5" />
                    Brand Identity
                  </CardTitle>
                  <CardDescription>
                    Customize the text that appears on your guest portal
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
                    <div className="flex justify-between">
                      <p className="text-xs text-muted-foreground">
                        Appears next to your logo in the header
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formData.brand_wordmark.length}/50
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Type className="h-5 w-5" />
                    Login Page Content
                  </CardTitle>
                  <CardDescription>
                    Customize the welcome message guests see when logging in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Welcome Title</Label>
                      <Input
                        id="title"
                        value={formData.guest_login_title}
                        onChange={(e) => setFormData({ ...formData, guest_login_title: e.target.value })}
                        placeholder={`Welcome to ${currentResort.name}`}
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
                      placeholder="Enter your room number and the PIN provided at check-in to access your guest portal."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Help guests understand how to log in
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges} 
              className="flex-1 sm:flex-none"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Discard Changes
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleResetToDefaults}
              className="sm:ml-auto text-muted-foreground"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>

        {/* Preview Panel - Right */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BrandingPreview
                  logoUrl={formData.login_logo_url}
                  primaryColor={formData.login_primary_color || DEFAULT_PRIMARY}
                  accentColor={formData.login_accent_color || DEFAULT_ACCENT}
                  theme={formData.brand_theme}
                  wordmark={formData.brand_wordmark}
                  resortName={currentResort.name}
                  heroImageUrl={formData.login_hero_image_url}
                  loginTitle={formData.guest_login_title}
                  loginSubtitle={formData.guest_login_subtitle}
                />
              </CardContent>
            </Card>

            {/* Quick Info Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">How it works</p>
                    <p>Changes are applied immediately to your guest portal after saving. Guests will see the new branding on their next page load.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
