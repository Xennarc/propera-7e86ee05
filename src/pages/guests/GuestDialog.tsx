import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

// Validate that a date string is a valid, reasonable date (year 1900-2100)
const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  if (year < 1900 || year > 2100) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const guestSchema = z.object({
  full_name: z.string().transform(val => val.trim()).pipe(z.string().min(2, 'Name must be at least 2 characters')),
  room_number: z.string().transform(val => val.trim()).pipe(z.string().min(1, 'Room number is required')),
  check_in_date: z.string().min(1, 'Check-in date is required').refine(isValidDateString, 'Invalid check-in date'),
  check_out_date: z.string().min(1, 'Check-out date is required').refine(isValidDateString, 'Invalid check-out date'),
  nationality: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  booking_reference: z.string().optional(),
  channel: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  if (!isValidDateString(data.check_in_date) || !isValidDateString(data.check_out_date)) return true;
  return new Date(data.check_in_date) <= new Date(data.check_out_date);
}, {
  message: 'Check-out must be after check-in',
  path: ['check_out_date'],
});

interface GuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  resortId: string;
  onSuccess: () => void;
}

const channels = ['DIRECT', 'OTA', 'TA', 'CORPORATE', 'GROUP'];

export function GuestDialog({ open, onOpenChange, guest, resortId, onSuccess }: GuestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    full_name: '',
    room_number: '',
    check_in_date: '',
    check_out_date: '',
    nationality: '',
    email: '',
    phone: '',
    booking_reference: '',
    channel: '',
    notes: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (guest) {
      setFormData({
        full_name: guest.full_name,
        room_number: guest.room_number,
        check_in_date: guest.check_in_date,
        check_out_date: guest.check_out_date,
        nationality: guest.nationality || '',
        email: guest.email || '',
        phone: guest.phone || '',
        booking_reference: guest.booking_reference || '',
        channel: guest.channel || '',
        notes: guest.notes || '',
      });
    } else {
      setFormData({
        full_name: '',
        room_number: '',
        check_in_date: '',
        check_out_date: '',
        nationality: '',
        email: '',
        phone: '',
        booking_reference: '',
        channel: '',
        notes: '',
      });
    }
    setErrors({});
  }, [guest, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = guestSchema.safeParse(formData);
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

    const guestData = {
      resort_id: resortId,
      full_name: formData.full_name.trim(),
      room_number: formData.room_number.trim(),
      check_in_date: formData.check_in_date,
      check_out_date: formData.check_out_date,
      nationality: formData.nationality.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      booking_reference: formData.booking_reference.trim() || null,
      channel: formData.channel || null,
      notes: formData.notes.trim() || null,
    };

    let error;
    if (guest) {
      const { error: updateError } = await supabase
        .from('guests')
        .update(guestData)
        .eq('id', guest.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('guests')
        .insert(guestData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: guest ? 'Guest updated' : 'Guest added' });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guest ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
          <DialogDescription>
            {guest ? 'Update guest information' : 'Add a new guest to the resort'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  // Clear error when user types valid value
                  if (e.target.value.trim().length >= 2 && errors.full_name) {
                    setErrors(prev => ({ ...prev, full_name: '' }));
                  }
                }}
                placeholder="John Smith"
              />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number *</Label>
              <Input
                id="room_number"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="101"
              />
              {errors.room_number && <p className="text-sm text-destructive">{errors.room_number}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_date">Check-in Date *</Label>
              <Input
                id="check_in_date"
                type="date"
                value={formData.check_in_date}
                onChange={(e) => {
                  const newCheckIn = e.target.value;
                  setFormData(prev => {
                    // Auto-correct check-out if it becomes invalid
                    if (prev.check_out_date && newCheckIn && prev.check_out_date < newCheckIn) {
                      return { ...prev, check_in_date: newCheckIn, check_out_date: newCheckIn };
                    }
                    return { ...prev, check_in_date: newCheckIn };
                  });
                  if (errors.check_in_date) {
                    setErrors(prev => ({ ...prev, check_in_date: '' }));
                  }
                }}
              />
              {errors.check_in_date && <p className="text-sm text-destructive">{errors.check_in_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_date">Check-out Date *</Label>
              <Input
                id="check_out_date"
                type="date"
                value={formData.check_out_date}
                min={formData.check_in_date || undefined}
                onChange={(e) => {
                  setFormData({ ...formData, check_out_date: e.target.value });
                  if (errors.check_out_date) {
                    setErrors(prev => ({ ...prev, check_out_date: '' }));
                  }
                }}
                aria-describedby="check_out_hint check_out_error"
              />
              <p id="check_out_hint" className="text-xs text-muted-foreground">
                Check-out must be on or after check-in.
              </p>
              {errors.check_out_date && (
                <p id="check_out_error" className="text-sm text-destructive">{errors.check_out_date}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="American"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking_reference">Booking Reference</Label>
              <Input
                id="booking_reference"
                value={formData.booking_reference}
                onChange={(e) => setFormData({ ...formData, booking_reference: e.target.value })}
                placeholder="BK123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Booking Channel</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) => setFormData({ ...formData, channel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Guest preferences, special requests, or any relevant information"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : guest ? 'Update Guest' : 'Add Guest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
