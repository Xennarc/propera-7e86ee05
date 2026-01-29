import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { getGuestPortalUrl } from '@/lib/url-utils';
import { useInvalidateResortBranding } from '@/hooks/useResortBranding';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Palette, Image, Type, Save, Shield, RotateCcw, 
  Sun, Moon, Monitor, Eye, Sparkles, AlertCircle, Copy,
  Fingerprint, Layers, ImageIcon
} from 'lucide-react';
import { EnhancedBrandingPreview } from '@/components/branding/EnhancedBrandingPreview';
import { ImageUploader } from '@/components/branding/ImageUploader';
import { ColorPresetCard, ENHANCED_COLOR_PRESETS } from '@/components/branding/ColorPresetCard';
import { FontPresetSelector } from '@/components/branding/FontPresetSelector';
import { ButtonStyleSelector, type ButtonStyle } from '@/components/branding/ButtonStyleSelector';
import { CardStyleSelector, type CardStyle } from '@/components/branding/CardStyleSelector';
import { RadiusSlider } from '@/components/branding/RadiusSlider';
import { BrandingSectionHeader } from '@/components/branding/BrandingSectionHeader';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'LIGHT', label: 'Light', icon: Sun, description: 'Clean, bright' },
  { value: 'DARK', label: 'Dark', icon: Moon, description: 'Elegant, modern' },
  { value: 'AUTO', label: 'Auto', icon: Monitor, description: 'Match device' },
];

const DEFAULT_PRIMARY = '#0E7490';
const DEFAULT_ACCENT = '#D8C7A6';

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
  // Enhanced branding fields
  brand_button_style: ButtonStyle;
  brand_card_style: CardStyle;
  brand_corner_radius: number;
  brand_font_family: string;
  brand_background_tint: string;
  brand_success_color: string;
  brand_warning_color: string;
  favicon_url: string;
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
  brand_button_style: 'rounded',
  brand_card_style: 'elevated',
  brand_corner_radius: 12,
  brand_font_family: 'Plus Jakarta Sans',
  brand_background_tint: '',
  brand_success_color: '',
  brand_warning_color: '',
  favicon_url: '',
};

export default function ResortBrandingPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort, refetch } = useResort();
  const invalidateResortBranding = useInvalidateResortBranding();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [originalData, setOriginalData] = useState<FormData>(initialFormData);
  const [openSections, setOpenSections] = useState<string[]>(['identity', 'colors']);

  const canAccess = currentResort && (isSuperAdmin() || getResortRole(currentResort.id) === 'RESORT_ADMIN');
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  useEffect(() => {
    if (currentResort) {
      fetchBranding();
    }
  }, [currentResort]);

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
        .select(`
          login_logo_url, login_hero_image_url, login_primary_color, login_accent_color, 
          guest_login_title, guest_login_subtitle, guest_login_instructions, brand_theme, brand_wordmark,
          brand_button_style, brand_card_style, brand_corner_radius, brand_font_family,
          brand_background_tint, brand_success_color, brand_warning_color, favicon_url
        `)
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
          brand_button_style: (data.brand_button_style as ButtonStyle) || 'rounded',
          brand_card_style: (data.brand_card_style as CardStyle) || 'elevated',
          brand_corner_radius: data.brand_corner_radius ?? 12,
          brand_font_family: data.brand_font_family || 'Plus Jakarta Sans',
          brand_background_tint: data.brand_background_tint || '',
          brand_success_color: data.brand_success_color || '',
          brand_warning_color: data.brand_warning_color || '',
          favicon_url: data.favicon_url || '',
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
          brand_button_style: formData.brand_button_style || 'rounded',
          brand_card_style: formData.brand_card_style || 'elevated',
          brand_corner_radius: formData.brand_corner_radius ?? 12,
          brand_font_family: formData.brand_font_family || 'Plus Jakarta Sans',
          brand_background_tint: formData.brand_background_tint.trim() || null,
          brand_success_color: formData.brand_success_color.trim() || null,
          brand_warning_color: formData.brand_warning_color.trim() || null,
          favicon_url: formData.favicon_url.trim() || null,
          onboarding_portal_done: true,
        })
        .eq('id', currentResort.id);

      if (error) throw error;

      invalidateResortBranding(currentResort.id);
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

  const applyColorPreset = (preset: typeof ENHANCED_COLOR_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      login_primary_color: preset.primary,
      login_accent_color: preset.accent,
      ...(preset.background && { brand_background_tint: preset.background }),
    }));
    toast.success(`Applied "${preset.name}" color scheme`);
  };

  const resetSection = (section: string) => {
    switch (section) {
      case 'identity':
        setFormData(prev => ({
          ...prev,
          login_logo_url: '',
          favicon_url: '',
          brand_wordmark: '',
        }));
        break;
      case 'colors':
        setFormData(prev => ({
          ...prev,
          login_primary_color: '',
          login_accent_color: '',
          brand_background_tint: '',
          brand_success_color: '',
          brand_warning_color: '',
        }));
        break;
      case 'typography':
        setFormData(prev => ({
          ...prev,
          brand_font_family: 'Plus Jakarta Sans',
        }));
        break;
      case 'components':
        setFormData(prev => ({
          ...prev,
          brand_button_style: 'rounded',
          brand_card_style: 'elevated',
          brand_corner_radius: 12,
          brand_theme: 'LIGHT',
        }));
        break;
      case 'login':
        setFormData(prev => ({
          ...prev,
          login_hero_image_url: '',
          guest_login_title: '',
          guest_login_subtitle: '',
          guest_login_instructions: '',
        }));
        break;
    }
    toast.info('Section reset');
  };

  const copyGuestUrl = () => {
    if (currentResort) {
      navigator.clipboard.writeText(getGuestPortalUrl(currentResort.code));
      toast.success('Guest login URL copied to clipboard');
    }
  };

  const guestLoginUrl = currentResort ? getGuestPortalUrl(currentResort.code) : '';

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Branding"
          description="Customize your guest portal appearance"
        />
        
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
        {/* Form Panel */}
        <div className="lg:col-span-3 space-y-4">
          <Accordion 
            type="multiple" 
            value={openSections} 
            onValueChange={setOpenSections}
            className="space-y-3"
          >
            {/* Brand Identity Section */}
            <AccordionItem value="identity" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Brand Identity</div>
                    <div className="text-xs text-muted-foreground">Logo, favicon, and wordmark</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-6 pt-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => resetSection('identity')} className="text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    <ImageUploader
                      label="Resort Logo"
                      description="Appears in header (256×256px)"
                      value={formData.login_logo_url}
                      onChange={(url) => setFormData({ ...formData, login_logo_url: url })}
                      resortId={currentResort.id}
                      imageType="logo"
                      aspectRatio="square"
                    />
                    
                    <ImageUploader
                      label="Favicon"
                      description="Browser tab icon (32×32px)"
                      value={formData.favicon_url}
                      onChange={(url) => setFormData({ ...formData, favicon_url: url })}
                      resortId={currentResort.id}
                      imageType="favicon"
                      aspectRatio="square"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wordmark">Wordmark / Tagline</Label>
                    <Input
                      id="wordmark"
                      value={formData.brand_wordmark}
                      onChange={(e) => setFormData({ ...formData, brand_wordmark: e.target.value })}
                      placeholder="e.g., Island Escape Collection"
                      maxLength={50}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Appears next to your logo in the header</span>
                      <span>{formData.brand_wordmark.length}/50</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Color Palette Section */}
            <AccordionItem value="colors" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Color Palette</div>
                    <div className="text-xs text-muted-foreground">Presets and custom colors</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-6 pt-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => resetSection('colors')} className="text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>

                  {/* Color Presets */}
                  <div>
                    <Label className="mb-3 block">Color Presets</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {ENHANCED_COLOR_PRESETS.slice(0, 8).map((preset) => {
                        const isActive = formData.login_primary_color === preset.primary && 
                                        formData.login_accent_color === preset.accent;
                        return (
                          <ColorPresetCard
                            key={preset.name}
                            preset={preset}
                            isActive={isActive}
                            onClick={() => applyColorPreset(preset)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primary">Primary Color</Label>
                      <div className="flex gap-2">
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
                          className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent">Accent Color</Label>
                      <div className="flex gap-2">
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
                          className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Background Tint */}
                  <div className="space-y-2">
                    <Label htmlFor="bgTint">Background Tint (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="bgTint"
                          value={formData.brand_background_tint}
                          onChange={(e) => setFormData({ ...formData, brand_background_tint: e.target.value })}
                          placeholder="#F8FAFB"
                          className="font-mono pl-10"
                        />
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded border"
                          style={{ backgroundColor: formData.brand_background_tint || '#ffffff' }}
                        />
                      </div>
                      <input
                        type="color"
                        value={formData.brand_background_tint || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, brand_background_tint: e.target.value })}
                        className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent p-0.5"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Subtle background overlay for pages</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Typography Section */}
            <AccordionItem value="typography" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Type className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Typography</div>
                    <div className="text-xs text-muted-foreground">Font family presets</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 pt-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => resetSection('typography')} className="text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>
                  
                  <FontPresetSelector
                    value={formData.brand_font_family}
                    onChange={(family) => setFormData({ ...formData, brand_font_family: family })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* UI Components Section */}
            <AccordionItem value="components" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">UI Components</div>
                    <div className="text-xs text-muted-foreground">Buttons, cards, and theme</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-6 pt-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => resetSection('components')} className="text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>

                  {/* Theme Mode */}
                  <div>
                    <Label className="mb-3 block">Theme Mode</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {THEME_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, brand_theme: option.value })}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                            formData.brand_theme === option.value
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <option.icon className={cn(
                            'h-5 w-5',
                            formData.brand_theme === option.value ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <span className={cn(
                            'text-sm font-medium',
                            formData.brand_theme === option.value ? 'text-primary' : 'text-foreground'
                          )}>
                            {option.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Style */}
                  <div>
                    <Label className="mb-3 block">Button Style</Label>
                    <ButtonStyleSelector
                      value={formData.brand_button_style}
                      onChange={(style) => setFormData({ ...formData, brand_button_style: style })}
                      primaryColor={formData.login_primary_color || DEFAULT_PRIMARY}
                    />
                  </div>

                  {/* Card Style */}
                  <div>
                    <Label className="mb-3 block">Card Style</Label>
                    <CardStyleSelector
                      value={formData.brand_card_style}
                      onChange={(style) => setFormData({ ...formData, brand_card_style: style })}
                    />
                  </div>

                  {/* Corner Radius */}
                  <RadiusSlider
                    value={formData.brand_corner_radius}
                    onChange={(value) => setFormData({ ...formData, brand_corner_radius: value })}
                    primaryColor={formData.login_primary_color || DEFAULT_PRIMARY}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Login Experience Section */}
            <AccordionItem value="login" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Login Experience</div>
                    <div className="text-xs text-muted-foreground">Hero image and welcome content</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-6 pt-2">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => resetSection('login')} className="text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>

                  <ImageUploader
                    label="Hero Background"
                    description="Login page background (1920×1080px)"
                    value={formData.login_hero_image_url}
                    onChange={(url) => setFormData({ ...formData, login_hero_image_url: url })}
                    resortId={currentResort.id}
                    imageType="hero"
                    aspectRatio="wide"
                  />

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
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Live Preview</span>
                </div>
                <EnhancedBrandingPreview
                  logoUrl={formData.login_logo_url}
                  primaryColor={formData.login_primary_color || DEFAULT_PRIMARY}
                  accentColor={formData.login_accent_color || DEFAULT_ACCENT}
                  theme={formData.brand_theme}
                  wordmark={formData.brand_wordmark}
                  resortName={currentResort.name}
                  heroImageUrl={formData.login_hero_image_url}
                  loginTitle={formData.guest_login_title}
                  loginSubtitle={formData.guest_login_subtitle}
                  buttonStyle={formData.brand_button_style}
                  cardStyle={formData.brand_card_style}
                  cornerRadius={formData.brand_corner_radius}
                  fontFamily={formData.brand_font_family}
                  backgroundTint={formData.brand_background_tint}
                />
              </CardContent>
            </Card>

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
