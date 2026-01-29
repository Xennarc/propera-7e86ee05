import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ActivityCategory, DifficultyLevel } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { ActivityIconPicker } from '@/components/ui/activity-icon-picker';
import { Upload, X, Image as ImageIcon, Loader2, Info, AlertTriangle, Clock, Users, Shield } from 'lucide-react';
import { ActivitySessionsList } from '@/components/activities/ActivitySessionsList';
import { HighlightListInput } from '@/components/ui/highlight-list-input';

const activitySchema = z.object({
  name: z.string().transform(val => val.trim()).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  category: z.string().min(1, 'Category is required'),
  icon_key: z.string().min(1, 'Please select an icon for this activity'),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  default_price_per_person: z.number().min(0, 'Price cannot be negative'),
  default_max_capacity: z.number().min(1, 'Capacity must be at least 1'),
});

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  resortId: string;
  onSuccess: () => void;
}

const categories: ActivityCategory[] = ['DIVE', 'EXCURSION', 'WATERSPORT', 'SPA', 'OTHER'];
const difficultyLevels: DifficultyLevel[] = ['EASY', 'MODERATE', 'ADVANCED'];

export function ActivityDialog({ open, onOpenChange, activity, resortId, onSuccess }: ActivityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    category: 'OTHER' as ActivityCategory,
    icon_key: null as string | null,
    image_url: null as string | null,
    description: '',
    short_description: '',
    full_description: '',
    // Pricing & Capacity
    default_price_per_person: 0,
    duration_minutes: 60,
    default_max_capacity: 10,
    min_capacity: '',
    age_min: '',
    max_age: '',
    difficulty_level: null as DifficultyLevel | null,
    is_swimming_required: false,
    suitable_for_non_swimmers: false,
    // Guest Booking Rules
    guest_can_book: true,
    requires_approval: false,
    guest_cutoff_hours: 2,
    max_pax_per_booking: 4,
    guest_can_cancel: true,
    guest_cancel_cutoff_hours: 4,
    is_active: true,
    // Content & Safety
    highlights: [] as string[],
    includes: '',
    health_and_safety_notes: '',
    cancellation_policy_text: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (activity) {
      // Parse highlights from JSON if it exists
      let highlights: string[] = [];
      if (activity.highlights) {
        try {
          highlights = Array.isArray(activity.highlights) 
            ? activity.highlights as string[] 
            : JSON.parse(activity.highlights as string);
        } catch {
          highlights = [];
        }
      }

      setFormData({
        name: activity.name,
        category: activity.category,
        icon_key: (activity as any).icon_key || null,
        image_url: activity.image_url || null,
        description: activity.description || '',
        short_description: activity.short_description || '',
        full_description: activity.full_description || '',
        default_price_per_person: activity.default_price_per_person,
        duration_minutes: activity.duration_minutes,
        default_max_capacity: activity.default_max_capacity,
        min_capacity: activity.min_capacity?.toString() || '',
        age_min: activity.age_min?.toString() || '',
        max_age: activity.max_age?.toString() || '',
        difficulty_level: (activity.difficulty_level as DifficultyLevel) || null,
        is_swimming_required: activity.is_swimming_required || false,
        suitable_for_non_swimmers: activity.suitable_for_non_swimmers || false,
        guest_can_book: activity.guest_can_book,
        requires_approval: activity.requires_approval,
        guest_cutoff_hours: activity.guest_cutoff_hours,
        max_pax_per_booking: activity.max_pax_per_booking,
        guest_can_cancel: activity.guest_can_cancel,
        guest_cancel_cutoff_hours: activity.guest_cancel_cutoff_hours,
        is_active: activity.is_active,
        highlights,
        includes: activity.includes || '',
        health_and_safety_notes: activity.health_and_safety_notes || '',
        cancellation_policy_text: activity.cancellation_policy_text || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'OTHER',
        icon_key: null,
        image_url: null,
        description: '',
        short_description: '',
        full_description: '',
        default_price_per_person: 0,
        duration_minutes: 60,
        default_max_capacity: 10,
        min_capacity: '',
        age_min: '',
        max_age: '',
        difficulty_level: null,
        is_swimming_required: false,
        suitable_for_non_swimmers: false,
        guest_can_book: true,
        requires_approval: false,
        guest_cutoff_hours: 2,
        max_pax_per_booking: 4,
        guest_can_cancel: true,
        guest_cancel_cutoff_hours: 4,
        is_active: true,
        highlights: [],
        includes: '',
        health_and_safety_notes: '',
        cancellation_policy_text: '',
      });
    }
    setErrors({});
    setActiveTab('basic');
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [activity, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Image must be less than 5MB' });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${resortId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('activity-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('activity-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      toast({ title: 'Image uploaded', description: 'Hero image has been uploaded successfully' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = activitySchema.safeParse({
      name: formData.name,
      category: formData.category,
      icon_key: formData.icon_key || '',
      duration_minutes: formData.duration_minutes,
      default_price_per_person: formData.default_price_per_person,
      default_max_capacity: formData.default_max_capacity,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      // Switch to basic tab if there are errors in required fields
      if (fieldErrors.name || fieldErrors.category || fieldErrors.icon_key) {
        setActiveTab('basic');
      }
      return;
    }

    setLoading(true);

    const trimmedName = formData.name.trim().toLowerCase();
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('id, name')
      .eq('resort_id', resortId)
      .ilike('name', trimmedName);

    const duplicate = existingActivities?.find(
      a => a.name.toLowerCase() === trimmedName && a.id !== activity?.id
    );

    if (duplicate) {
      setErrors({ name: `An activity named "${duplicate.name}" already exists` });
      setActiveTab('basic');
      setLoading(false);
      return;
    }

    const activityData = {
      resort_id: resortId,
      name: formData.name.trim(),
      category: formData.category,
      icon_key: formData.icon_key,
      image_url: formData.image_url,
      description: formData.description.trim() || null,
      short_description: formData.short_description.trim() || null,
      full_description: formData.full_description.trim() || null,
      default_price_per_person: formData.default_price_per_person,
      duration_minutes: formData.duration_minutes,
      default_max_capacity: formData.default_max_capacity,
      min_capacity: formData.min_capacity ? parseInt(formData.min_capacity) : null,
      age_min: formData.age_min ? parseInt(formData.age_min) : null,
      max_age: formData.max_age ? parseInt(formData.max_age) : null,
      difficulty_level: formData.difficulty_level,
      is_swimming_required: formData.is_swimming_required,
      suitable_for_non_swimmers: formData.suitable_for_non_swimmers,
      guest_can_book: formData.guest_can_book,
      requires_approval: formData.requires_approval,
      guest_cutoff_hours: formData.guest_cutoff_hours,
      max_pax_per_booking: formData.max_pax_per_booking,
      guest_can_cancel: formData.guest_can_cancel,
      guest_cancel_cutoff_hours: formData.guest_cancel_cutoff_hours,
      is_active: formData.is_active,
      highlights: formData.highlights.length > 0 ? formData.highlights : null,
      includes: formData.includes.trim() || null,
      health_and_safety_notes: formData.health_and_safety_notes.trim() || null,
      cancellation_policy_text: formData.cancellation_policy_text.trim() || null,
    };

    let error;
    if (activity) {
      const { error: updateError } = await supabase
        .from('activities')
        .update(activityData)
        .eq('id', activity.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('activities')
        .insert(activityData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: activity ? 'Activity updated' : 'Activity added' });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{activity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          <DialogDescription>
            {activity ? 'Update activity details and guest-facing content' : 'Create a new activity or excursion'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col" autoComplete="off">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Capacity</TabsTrigger>
              <TabsTrigger value="rules">Booking Rules</TabsTrigger>
              <TabsTrigger value="content">Content & Safety</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2">
              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      ref={nameInputRef}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (e.target.value.trim().length >= 2 && errors.name) {
                          setErrors(prev => ({ ...prev, name: '' }));
                        }
                      }}
                      placeholder="Sunset Diving"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as ActivityCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Icon *</Label>
                  <ActivityIconPicker
                    value={formData.icon_key}
                    onChange={(value) => {
                      setFormData({ ...formData, icon_key: value });
                      if (value && errors.icon_key) {
                        setErrors(prev => ({ ...prev, icon_key: '' }));
                      }
                    }}
                    required
                    error={errors.icon_key}
                  />
                  {errors.icon_key && <p className="text-sm text-destructive">{errors.icon_key}</p>}
                </div>

                {/* Hero Image Upload */}
                <div className="space-y-2">
                  <Label>Hero Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {formData.image_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img 
                        src={formData.image_url} 
                        alt="Activity hero" 
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm font-medium">Click to upload hero image</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    placeholder="Brief tagline shown on activity cards"
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground">Shown on activity catalogue cards (max 150 chars)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_description">Full Description</Label>
                  <Textarea
                    id="full_description"
                    value={formData.full_description}
                    onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                    placeholder="Detailed description shown on the activity detail page..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Detailed description shown on guest activity page</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Internal Notes</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Internal notes (not shown to guests)..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Staff-only notes, not visible to guests</p>
                </div>
              </TabsContent>

              {/* Tab 2: Pricing & Capacity */}
              <TabsContent value="pricing" className="space-y-4 mt-0">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price per Person ($)</Label>
                    <NumericInput
                      id="price"
                      min={0}
                      value={formData.default_price_per_person}
                      onChange={(value) => setFormData({ ...formData, default_price_per_person: value })}
                      allowDecimal
                      defaultValue={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <NumericInput
                      id="duration"
                      min={1}
                      value={formData.duration_minutes}
                      onChange={(value) => setFormData({ ...formData, duration_minutes: value })}
                      defaultValue={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Max Capacity</Label>
                    <NumericInput
                      id="capacity"
                      min={1}
                      value={formData.default_max_capacity}
                      onChange={(value) => setFormData({ ...formData, default_max_capacity: value })}
                      defaultValue={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_capacity">Min Capacity</Label>
                    <Input
                      id="min_capacity"
                      type="number"
                      min="1"
                      value={formData.min_capacity}
                      onChange={(e) => setFormData({ ...formData, min_capacity: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty_level">Difficulty Level</Label>
                    <Select
                      value={formData.difficulty_level || ''}
                      onValueChange={(value) => setFormData({ ...formData, difficulty_level: value as DifficultyLevel || null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MODERATE">Moderate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                <h4 className="font-medium text-sm text-muted-foreground">Age Requirements</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age_min">Minimum Age</Label>
                    <Input
                      id="age_min"
                      type="number"
                      min="0"
                      value={formData.age_min}
                      onChange={(e) => setFormData({ ...formData, age_min: e.target.value })}
                      placeholder="No minimum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_age">Maximum Age</Label>
                    <Input
                      id="max_age"
                      type="number"
                      min="0"
                      value={formData.max_age}
                      onChange={(e) => setFormData({ ...formData, max_age: e.target.value })}
                      placeholder="No maximum"
                    />
                  </div>
                </div>

                <Separator />
                <h4 className="font-medium text-sm text-muted-foreground">Swimming Requirements</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="is_swimming_required">Swimming Required</Label>
                      <p className="text-xs text-muted-foreground">Guests must be able to swim</p>
                    </div>
                    <Switch
                      id="is_swimming_required"
                      checked={formData.is_swimming_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_swimming_required: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="suitable_for_non_swimmers">Suitable for Non-Swimmers</Label>
                      <p className="text-xs text-muted-foreground">Activity can accommodate non-swimmers</p>
                    </div>
                    <Switch
                      id="suitable_for_non_swimmers"
                      checked={formData.suitable_for_non_swimmers}
                      onCheckedChange={(checked) => setFormData({ ...formData, suitable_for_non_swimmers: checked })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Guest Booking Rules */}
              <TabsContent value="rules" className="space-y-4 mt-0">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Guest Portal Settings</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        These settings control what guests see in the "Good to know" section and how they can interact with this activity.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Availability */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="is_active" className="text-base">Activity Active</Label>
                      <p className="text-sm text-muted-foreground">Show this activity in lists and allow bookings</p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>

                  {/* Guest Booking Toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="guest_can_book" className="text-base">Guests Can Book Online</Label>
                      <p className="text-sm text-muted-foreground">Allow guests to book through the guest portal</p>
                    </div>
                    <Switch
                      id="guest_can_book"
                      checked={formData.guest_can_book}
                      onCheckedChange={(checked) => setFormData({ ...formData, guest_can_book: checked })}
                    />
                  </div>

                  {formData.guest_can_book && (
                    <>
                      {/* Max Guests Per Booking */}
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <Label htmlFor="max_pax_per_booking">Maximum Guests Per Booking</Label>
                        </div>
                        <NumericInput
                          id="max_pax_per_booking"
                          min={1}
                          max={20}
                          value={formData.max_pax_per_booking}
                          onChange={(value) => setFormData({ ...formData, max_pax_per_booking: value })}
                          defaultValue={4}
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          Guests will see "Maximum {formData.max_pax_per_booking} guests per booking"
                        </p>
                      </div>

                      {/* Booking Cutoff */}
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Label htmlFor="guest_cutoff_hours">Booking Cutoff (Hours Before Start)</Label>
                        </div>
                        <NumericInput
                          id="guest_cutoff_hours"
                          min={0}
                          max={72}
                          value={formData.guest_cutoff_hours}
                          onChange={(value) => setFormData({ ...formData, guest_cutoff_hours: value })}
                          defaultValue={2}
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          Guests cannot book within {formData.guest_cutoff_hours}h of activity start time
                        </p>
                      </div>

                      {/* Requires Approval */}
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor="requires_approval" className="text-base">Requires Staff Approval</Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Bookings need manual confirmation by staff</p>
                        </div>
                        <Switch
                          id="requires_approval"
                          checked={formData.requires_approval}
                          onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                        />
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Cancellation Settings */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="guest_can_cancel" className="text-base">Guests Can Cancel Online</Label>
                      <p className="text-sm text-muted-foreground">Allow guests to cancel their own bookings</p>
                    </div>
                    <Switch
                      id="guest_can_cancel"
                      checked={formData.guest_can_cancel}
                      onCheckedChange={(checked) => setFormData({ ...formData, guest_can_cancel: checked })}
                    />
                  </div>

                  {formData.guest_can_cancel && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="guest_cancel_cutoff_hours">Cancellation Deadline (Hours Before Start)</Label>
                      </div>
                      <NumericInput
                        id="guest_cancel_cutoff_hours"
                        min={0}
                        max={72}
                        value={formData.guest_cancel_cutoff_hours}
                        onChange={(value) => setFormData({ ...formData, guest_cancel_cutoff_hours: value })}
                        defaultValue={4}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        Guests will see "You can cancel online up to {formData.guest_cancel_cutoff_hours}h before"
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Content & Safety */}
              <TabsContent value="content" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Highlights</Label>
                  <HighlightListInput
                    value={formData.highlights}
                    onChange={(highlights) => setFormData({ ...formData, highlights })}
                    placeholder="e.g., Professional equipment provided"
                  />
                  <p className="text-xs text-muted-foreground">Key features shown as bullet points to guests</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="includes">What's Included</Label>
                  <Textarea
                    id="includes"
                    value={formData.includes}
                    onChange={(e) => setFormData({ ...formData, includes: e.target.value })}
                    placeholder="Equipment, refreshments, transportation..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Describe what's included in the activity price</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="health_and_safety_notes">Health & Safety Notes</Label>
                  </div>
                  <Textarea
                    id="health_and_safety_notes"
                    value={formData.health_and_safety_notes}
                    onChange={(e) => setFormData({ ...formData, health_and_safety_notes: e.target.value })}
                    placeholder="Important safety information for guests..."
                    rows={3}
                    className="border-amber-200 focus-visible:ring-amber-400/20"
                  />
                  <p className="text-xs text-muted-foreground">Displayed with a warning icon on the guest page</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellation_policy_text">Custom Cancellation Policy</Label>
                  <Textarea
                    id="cancellation_policy_text"
                    value={formData.cancellation_policy_text}
                    onChange={(e) => setFormData({ ...formData, cancellation_policy_text: e.target.value })}
                    placeholder="Optional: Override the default cancellation policy text..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to use auto-generated text based on your cancellation settings</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Sessions Management - Only show when editing */}
          {activity && (
            <>
              <Separator className="my-4" />
              <ActivitySessionsList
                activityId={activity.id}
                activityName={activity.name}
                resortId={resortId}
                onClose={() => onOpenChange(false)}
              />
            </>
          )}

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : activity ? 'Update Activity' : 'Add Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
