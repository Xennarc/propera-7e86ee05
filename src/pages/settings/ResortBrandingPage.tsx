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
import { Palette, ExternalLink, Image, Type, Save, Shield } from 'lucide-react';

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
        .select('login_logo_url, login_hero_image_url, login_primary_color, login_accent_color, guest_login_title, guest_login_subtitle, guest_login_instructions')
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
          onboarding_portal_done: true,
        })
        .eq('id', currentResort.id);

      if (error) throw error;

      // Also mark branding as done if there's any content
      const hasBranding = Object.values(formData).some(v => v.trim() !== '');
      if (hasBranding) {
        // Update onboarding status if needed
        await supabase
          .from('resorts')
          .update({ onboarding_status: 'IN_PROGRESS' })
          .eq('id', currentResort.id)
          .eq('onboarding_status', 'NOT_STARTED');
      }

      await refetch();
      toast.success('Branding settings saved!');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
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
      <PageHeader
        title="Guest Portal Branding"
        description={`Customize the guest login experience for ${currentResort.name}`}
        action={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logo & Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo & Images
            </CardTitle>
            <CardDescription>
              Add your resort logo and background imagery
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
                Your resort logo displayed on the login page (recommended: PNG with transparent background)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero">Hero Image URL</Label>
              <Input
                id="hero"
                value={formData.login_hero_image_url}
                onChange={(e) => setFormData({ ...formData, login_hero_image_url: e.target.value })}
                placeholder="https://example.com/hero.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Background image for the login page (recommended: 1920x1080 or larger)
              </p>
            </div>

            {/* Preview */}
            {(formData.login_logo_url || formData.login_hero_image_url) && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Preview</p>
                {formData.login_logo_url && (
                  <img 
                    src={formData.login_logo_url} 
                    alt="Logo preview" 
                    className="h-12 object-contain"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                )}
                {formData.login_hero_image_url && (
                  <img 
                    src={formData.login_hero_image_url} 
                    alt="Hero preview" 
                    className="h-24 w-full object-cover rounded"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
            <CardDescription>
              Customize button and accent colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  value={formData.login_primary_color}
                  onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                  placeholder="#0E7490"
                  className="flex-1"
                />
                <input
                  type="color"
                  value={formData.login_primary_color || '#0E7490'}
                  onChange={(e) => setFormData({ ...formData, login_primary_color: e.target.value })}
                  className="w-12 h-10 rounded border border-input cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main button and link color (hex format, e.g., #0E7490)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent"
                  value={formData.login_accent_color}
                  onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                  placeholder="#D8C7A6"
                  className="flex-1"
                />
                <input
                  type="color"
                  value={formData.login_accent_color || '#D8C7A6'}
                  onChange={(e) => setFormData({ ...formData, login_accent_color: e.target.value })}
                  className="w-12 h-10 rounded border border-input cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Secondary accent color for highlights
              </p>
            </div>

            {/* Color preview */}
            {(formData.login_primary_color || formData.login_accent_color) && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Color Preview</p>
                <div className="flex gap-2">
                  {formData.login_primary_color && (
                    <div 
                      className="h-10 w-20 rounded flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: formData.login_primary_color }}
                    >
                      Primary
                    </div>
                  )}
                  {formData.login_accent_color && (
                    <div 
                      className="h-10 w-20 rounded flex items-center justify-center text-xs font-medium"
                      style={{ backgroundColor: formData.login_accent_color }}
                    >
                      Accent
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Text Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Login Page Text
            </CardTitle>
            <CardDescription>
              Customize the welcome message on your guest login page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Login Title</Label>
                <Input
                  id="title"
                  value={formData.guest_login_title}
                  onChange={(e) => setFormData({ ...formData, guest_login_title: e.target.value })}
                  placeholder="Welcome to Paradise Island"
                />
                <p className="text-xs text-muted-foreground">
                  Main heading on the login page
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.guest_login_subtitle}
                  onChange={(e) => setFormData({ ...formData, guest_login_subtitle: e.target.value })}
                  placeholder="Your island experience awaits"
                />
                <p className="text-xs text-muted-foreground">
                  Secondary text below the title
                </p>
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
              <p className="text-xs text-muted-foreground">
                Help text explaining how guests should log in
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Link */}
        <Card className="lg:col-span-2">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Guest Login Page</p>
                <p className="text-sm text-muted-foreground">
                  Preview your branded login page
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Preview
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
