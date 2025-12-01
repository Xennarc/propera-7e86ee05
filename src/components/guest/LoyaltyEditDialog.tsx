import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LoyaltyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: {
    id: string;
    full_name: string;
    loyalty_tier?: string | null;
    is_vip?: boolean;
    notes_internal?: string | null;
  };
  onSuccess: () => void;
}

const TIER_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BRONZE', label: 'Bronze' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'PLATINUM', label: 'Platinum' },
  { value: 'DIAMOND', label: 'Diamond' },
];

export function LoyaltyEditDialog({
  open,
  onOpenChange,
  guest,
  onSuccess,
}: LoyaltyEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isVip, setIsVip] = useState(guest.is_vip || false);
  const [loyaltyTier, setLoyaltyTier] = useState(guest.loyalty_tier || '');
  const [customTier, setCustomTier] = useState('');
  const [notesInternal, setNotesInternal] = useState(guest.notes_internal || '');

  useEffect(() => {
    if (open) {
      setIsVip(guest.is_vip || false);
      
      // Check if tier is a preset or custom
      const isPreset = TIER_OPTIONS.some(opt => opt.value === guest.loyalty_tier);
      if (isPreset || !guest.loyalty_tier) {
        setLoyaltyTier(guest.loyalty_tier || '');
        setCustomTier('');
      } else {
        setLoyaltyTier('CUSTOM');
        setCustomTier(guest.loyalty_tier);
      }
      
      setNotesInternal(guest.notes_internal || '');
    }
  }, [open, guest]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const finalTier = loyaltyTier === 'CUSTOM' ? customTier : loyaltyTier;

      const { error } = await supabase
        .from('guests')
        .update({
          is_vip: isVip,
          loyalty_tier: finalTier || null,
          notes_internal: notesInternal || null,
        })
        .eq('id', guest.id);

      if (error) throw error;

      toast({
        title: 'Updated',
        description: 'Guest loyalty information updated successfully.',
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Loyalty & Internal Notes</DialogTitle>
          <DialogDescription>
            Manage loyalty status and internal notes for {guest.full_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* VIP Status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="vip-toggle" className="text-base font-medium">
                VIP Status
              </Label>
              <p className="text-sm text-muted-foreground">
                Mark this guest as VIP for priority treatment
              </p>
            </div>
            <Switch
              id="vip-toggle"
              checked={isVip}
              onCheckedChange={setIsVip}
            />
          </div>

          {/* Loyalty Tier */}
          <div className="space-y-2">
            <Label htmlFor="loyalty-tier">Loyalty Tier</Label>
            <Select value={loyaltyTier} onValueChange={setLoyaltyTier}>
              <SelectTrigger id="loyalty-tier">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value="CUSTOM">Custom Tier...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Tier Input */}
          {loyaltyTier === 'CUSTOM' && (
            <div className="space-y-2">
              <Label htmlFor="custom-tier">Custom Tier Name</Label>
              <Input
                id="custom-tier"
                value={customTier}
                onChange={(e) => setCustomTier(e.target.value)}
                placeholder="e.g., Elite, Preferred Guest"
                maxLength={50}
              />
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes-internal">Internal Notes</Label>
            <Textarea
              id="notes-internal"
              value={notesInternal}
              onChange={(e) => setNotesInternal(e.target.value)}
              placeholder="Preferences, allergies, special requests, etc."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes are for staff only and not visible to the guest.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
