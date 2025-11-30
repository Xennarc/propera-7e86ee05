import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resort } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ConvertDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resort: Resort;
  onSuccess: () => void;
}

export function ConvertDemoDialog({ open, onOpenChange, resort, onSuccess }: ConvertDemoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: resort.name.replace(/^Demo – /, ''),
    code: resort.code.replace(/^DEMO-/, '').split('-')[0] || resort.code,
    clearDemoData: false,
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Resort name is required' });
      return;
    }

    setLoading(true);

    try {
      // Check if the new code is unique (if changed)
      if (formData.code !== resort.code) {
        const { data: existing } = await supabase
          .from('resorts')
          .select('id')
          .eq('code', formData.code.toUpperCase())
          .neq('id', resort.id)
          .single();

        if (existing) {
          toast({ variant: 'destructive', title: 'Error', description: 'Resort code already exists' });
          setLoading(false);
          return;
        }
      }

      // Clear demo data if requested
      if (formData.clearDemoData) {
        // Delete activity bookings
        await supabase
          .from('activity_bookings')
          .delete()
          .eq('resort_id', resort.id);

        // Delete restaurant reservations
        await supabase
          .from('restaurant_reservations')
          .delete()
          .eq('resort_id', resort.id);

        // Delete stay feedback
        await supabase
          .from('stay_feedback')
          .delete()
          .eq('resort_id', resort.id);

        // Delete guests
        await supabase
          .from('guests')
          .delete()
          .eq('resort_id', resort.id);

        // Delete activity sessions
        await supabase
          .from('activity_sessions')
          .delete()
          .eq('resort_id', resort.id);

        // Delete restaurant time slots
        await supabase
          .from('restaurant_time_slots')
          .delete()
          .eq('resort_id', resort.id);
      }

      // Update resort to ACTIVE
      const { error: updateError } = await supabase
        .from('resorts')
        .update({
          name: formData.name.trim(),
          code: formData.code.toUpperCase(),
          status: 'ACTIVE',
          is_demo: false,
          demo_expires_at: null,
          demo_note: null,
        })
        .eq('id', resort.id);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Resort converted to live successfully' });
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error converting resort:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Failed to convert resort' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Convert to Live Resort
          </DialogTitle>
          <DialogDescription>
            This will activate {resort.name} as a production resort.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Resort Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Paradise Island Resort"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Resort Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="PIR"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              This will be used in the guest portal URL
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <Checkbox
              id="clearDemoData"
              checked={formData.clearDemoData}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, clearDemoData: checked as boolean })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="clearDemoData" className="text-sm font-medium cursor-pointer">
                Clear demo data
              </Label>
              <p className="text-xs text-muted-foreground">
                Remove sample guests, bookings, and reservations. Activities, restaurants, and settings will be kept.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Converting...' : 'Convert to Live'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}