import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Target, Plus, X, Loader2, Bed, UtensilsCrossed, Activity, Star } from 'lucide-react';
import {
  useStaffGuestPreferences,
  PreferenceCategory,
  PREFERENCE_SUGGESTIONS,
  CATEGORY_LABELS,
  StaffGuestPreference,
} from '@/hooks/useStaffGuestPreferences';

interface StaffGuestPreferencesCardProps {
  guestId: string;
  resortId: string;
}

const CATEGORY_ICONS: Record<PreferenceCategory, React.ReactNode> = {
  room: <Bed className="h-3.5 w-3.5" />,
  dining: <UtensilsCrossed className="h-3.5 w-3.5" />,
  activity: <Activity className="h-3.5 w-3.5" />,
  general: <Star className="h-3.5 w-3.5" />,
};

export function StaffGuestPreferencesCard({
  guestId,
  resortId,
}: StaffGuestPreferencesCardProps) {
  const {
    preferences,
    hasPreferences,
    isLoading,
    addPreference,
    removePreference,
    isAdding,
    isRemoving,
  } = useStaffGuestPreferences({ guestId, resortId });

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PreferenceCategory>('room');
  const [customValue, setCustomValue] = useState('');

  const handleAddPreference = async (value: string) => {
    if (!value.trim()) return;
    try {
      await addPreference({ category: selectedCategory, value });
      setCustomValue('');
      setIsOpen(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleRemovePreference = async (id: string) => {
    try {
      await removePreference(id);
    } catch {
      // Error handled by hook
    }
  };

  // Get suggestions not already added
  const existingValues = new Set(
    preferences[selectedCategory].map((p) => p.value.toLowerCase())
  );
  const availableSuggestions = PREFERENCE_SUGGESTIONS[selectedCategory].filter(
    (s) => !existingValues.has(s.toLowerCase())
  );

  const renderPreferencePills = (items: StaffGuestPreference[]) => {
    if (items.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((pref) => (
          <Badge
            key={pref.id}
            variant="secondary"
            className="pl-2 pr-1 py-0.5 text-xs font-normal gap-1 group"
          >
            {pref.value}
            <button
              onClick={() => handleRemovePreference(pref.id)}
              disabled={isRemoving}
              className="ml-0.5 hover:bg-destructive/20 rounded p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${pref.value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    );
  };

  const renderCategorySection = (category: PreferenceCategory) => {
    const items = preferences[category];
    if (items.length === 0) return null;

    return (
      <div key={category} className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {CATEGORY_ICONS[category]}
          <span>{CATEGORY_LABELS[category]}</span>
        </div>
        {renderPreferencePills(items)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Preferences
          </CardTitle>
          {hasPreferences && (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <AddPreferenceForm
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  customValue={customValue}
                  onCustomValueChange={setCustomValue}
                  availableSuggestions={availableSuggestions}
                  onAdd={handleAddPreference}
                  isAdding={isAdding}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasPreferences ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-1">
              No structured preferences recorded
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Add preferences for faster service
            </p>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Preference
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <AddPreferenceForm
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  customValue={customValue}
                  onCustomValueChange={setCustomValue}
                  availableSuggestions={availableSuggestions}
                  onAdd={handleAddPreference}
                  isAdding={isAdding}
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="space-y-3">
            {renderCategorySection('room')}
            {renderCategorySection('dining')}
            {renderCategorySection('activity')}
            {renderCategorySection('general')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Extracted form component for reuse
interface AddPreferenceFormProps {
  selectedCategory: PreferenceCategory;
  onCategoryChange: (category: PreferenceCategory) => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  availableSuggestions: string[];
  onAdd: (value: string) => void;
  isAdding: boolean;
}

function AddPreferenceForm({
  selectedCategory,
  onCategoryChange,
  customValue,
  onCustomValueChange,
  availableSuggestions,
  onAdd,
  isAdding,
}: AddPreferenceFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <Select
          value={selectedCategory}
          onValueChange={(v) => onCategoryChange(v as PreferenceCategory)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="room">Room</SelectItem>
            <SelectItem value="dining">Dining</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {availableSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quick Add</label>
          <div className="flex flex-wrap gap-1">
            {availableSuggestions.slice(0, 6).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onAdd(suggestion)}
                disabled={isAdding}
                className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Custom</label>
        <div className="flex gap-1.5">
          <Input
            value={customValue}
            onChange={(e) => onCustomValueChange(e.target.value)}
            placeholder="Type preference..."
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customValue.trim()) {
                onAdd(customValue);
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 px-2"
            onClick={() => onAdd(customValue)}
            disabled={!customValue.trim() || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
