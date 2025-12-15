import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Json } from '@/integrations/supabase/types';

interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  required?: boolean;
}

interface FormData {
  is_enabled: boolean;
  open_days_before_checkin: number;
  allow_activity_bookings: boolean;
  allow_dining_bookings: boolean;
  allow_spa_bookings: boolean;
  show_arrival_details: boolean;
  show_preferences: boolean;
  show_special_occasions: boolean;
  custom_questions_json: CustomQuestion[];
  welcome_message: string;
  internal_guidance_notes: string;
}

export default function PrearrivalSettingsPage() {
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    is_enabled: false,
    open_days_before_checkin: 30,
    allow_activity_bookings: true,
    allow_dining_bookings: true,
    allow_spa_bookings: false,
    show_arrival_details: true,
    show_preferences: true,
    show_special_occasions: true,
    custom_questions_json: [],
    welcome_message: '',
    internal_guidance_notes: '',
  });

  const [settingsId, setSettingsId] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['prearrival-settings', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return null;

      const { data, error } = await supabase
        .from('prearrival_settings')
        .select('*')
        .eq('resort_id', currentResort.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentResort?.id,
  });

  useEffect(() => {
    if (settings) {
      setSettingsId(settings.id);
      const customQuestions = settings.custom_questions_json;
      setFormData({
        is_enabled: settings.is_enabled,
        open_days_before_checkin: settings.open_days_before_checkin,
        allow_activity_bookings: settings.allow_activity_bookings,
        allow_dining_bookings: settings.allow_dining_bookings,
        allow_spa_bookings: settings.allow_spa_bookings,
        show_arrival_details: settings.show_arrival_details,
        show_preferences: settings.show_preferences,
        show_special_occasions: settings.show_special_occasions,
        custom_questions_json: Array.isArray(customQuestions) 
          ? (customQuestions as unknown as CustomQuestion[]) 
          : [],
        welcome_message: settings.welcome_message || '',
        internal_guidance_notes: settings.internal_guidance_notes || '',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!currentResort?.id) throw new Error('No resort selected');

      const payload = {
        is_enabled: data.is_enabled,
        open_days_before_checkin: data.open_days_before_checkin,
        allow_activity_bookings: data.allow_activity_bookings,
        allow_dining_bookings: data.allow_dining_bookings,
        allow_spa_bookings: data.allow_spa_bookings,
        show_arrival_details: data.show_arrival_details,
        show_preferences: data.show_preferences,
        show_special_occasions: data.show_special_occasions,
        custom_questions_json: data.custom_questions_json as unknown as Json,
        welcome_message: data.welcome_message || null,
        internal_guidance_notes: data.internal_guidance_notes || null,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        // Update existing
        const { error } = await supabase
          .from('prearrival_settings')
          .update(payload)
          .eq('id', settingsId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('prearrival_settings')
          .insert({
            resort_id: currentResort.id,
            ...payload,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearrival-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Pre-arrival settings have been updated.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving settings',
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addCustomQuestion = () => {
    const newQuestion: CustomQuestion = {
      id: crypto.randomUUID(),
      question: '',
      type: 'text',
      required: false,
    };
    setFormData(prev => ({
      ...prev,
      custom_questions_json: [...prev.custom_questions_json, newQuestion],
    }));
  };

  const updateCustomQuestion = (id: string, updates: Partial<CustomQuestion>) => {
    setFormData(prev => ({
      ...prev,
      custom_questions_json: prev.custom_questions_json.map(q =>
        q.id === id ? { ...q, ...updates } : q
      ),
    }));
  };

  const removeCustomQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      custom_questions_json: prev.custom_questions_json.filter(q => q.id !== id),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pre-Arrival Settings" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Arrival Settings"
        description="Configure the pre-arrival experience for your guests"
        action={
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Arrival Portal</CardTitle>
          <CardDescription>
            Allow guests to plan their stay before arrival
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Pre-Arrival</Label>
              <p className="text-sm text-muted-foreground">
                Guests will be able to access pre-arrival features before their check-in date
              </p>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Open Days Before Check-in</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={formData.open_days_before_checkin}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                open_days_before_checkin: parseInt(e.target.value) || 30 
              }))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Pre-arrival will be available this many days before arrival
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Booking Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Arrival Bookings</CardTitle>
          <CardDescription>
            What can guests book before arrival?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Activity Bookings</Label>
              <p className="text-sm text-muted-foreground">Allow guests to pre-book activities</p>
            </div>
            <Switch
              checked={formData.allow_activity_bookings}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_activity_bookings: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Dining Reservations</Label>
              <p className="text-sm text-muted-foreground">Allow guests to pre-book restaurants</p>
            </div>
            <Switch
              checked={formData.allow_dining_bookings}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_dining_bookings: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Spa Bookings</Label>
              <p className="text-sm text-muted-foreground">Allow guests to pre-book spa treatments</p>
            </div>
            <Switch
              checked={formData.allow_spa_bookings}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_spa_bookings: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Arrival Form Sections</CardTitle>
          <CardDescription>
            Choose which sections to show in the pre-arrival wizard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Arrival Details</Label>
              <p className="text-sm text-muted-foreground">Flight info, arrival time, transfers</p>
            </div>
            <Switch
              checked={formData.show_arrival_details}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_arrival_details: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Preferences</Label>
              <p className="text-sm text-muted-foreground">Dietary, allergies, room preferences</p>
            </div>
            <Switch
              checked={formData.show_preferences}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_preferences: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Special Occasions</Label>
              <p className="text-sm text-muted-foreground">Honeymoon, anniversary, birthday</p>
            </div>
            <Switch
              checked={formData.show_special_occasions}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_special_occasions: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Questions</CardTitle>
              <CardDescription>
                Add resort-specific questions to the pre-arrival form
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addCustomQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.custom_questions_json.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom questions added yet
            </div>
          ) : (
            formData.custom_questions_json.map((question) => (
              <div key={question.id} className="flex gap-3 items-start p-4 border rounded-lg">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Question text"
                    value={question.question}
                    onChange={(e) => updateCustomQuestion(question.id, { question: e.target.value })}
                  />
                  <div className="flex gap-3">
                    <Select
                      value={question.type}
                      onValueChange={(value) => updateCustomQuestion(question.id, { type: value as CustomQuestion['type'] })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="select">Single Select</SelectItem>
                        <SelectItem value="multiselect">Multi Select</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={question.required}
                        onCheckedChange={(checked) => updateCustomQuestion(question.id, { required: checked })}
                      />
                      <Label className="text-sm">Required</Label>
                    </div>
                  </div>
                  {(question.type === 'select' || question.type === 'multiselect') && (
                    <Input
                      placeholder="Options (comma separated)"
                      value={question.options?.join(', ') || ''}
                      onChange={(e) => updateCustomQuestion(question.id, { 
                        options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                      })}
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeCustomQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome Message</CardTitle>
          <CardDescription>
            Displayed to guests on their pre-arrival home page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Welcome to our resort! We're excited to have you..."
            value={formData.welcome_message}
            onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Guidance Notes</CardTitle>
          <CardDescription>
            Notes for staff about handling pre-arrival requests (not visible to guests)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Staff guidance for processing pre-arrival information..."
            value={formData.internal_guidance_notes}
            onChange={(e) => setFormData(prev => ({ ...prev, internal_guidance_notes: e.target.value }))}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
