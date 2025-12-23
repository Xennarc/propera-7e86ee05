import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { useGuestMutations } from '@/hooks/useGuestMutations';
import { GuestCreatedModal } from '@/components/guests/GuestCreatedModal';
import { z } from 'zod';
import { Key } from 'lucide-react';

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
  resortCode?: string;
  onSuccess: () => void;
}

const channels = ['DIRECT', 'OTA', 'TA', 'CORPORATE', 'GROUP'];

export function GuestDialog({ open, onOpenChange, guest, resortId, resortCode, onSuccess }: GuestDialogProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatePin, setGeneratePin] = useState(true);
  const [createdGuest, setCreatedGuest] = useState<{
    guest: { id: string; full_name: string; room_number: string; check_in_date: string; check_out_date: string };
    pin?: string;
  } | null>(null);
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
  const { createGuest, updateGuest } = useGuestMutations();

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
      setGeneratePin(false); // Don't regenerate PIN for existing guests
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
      setGeneratePin(true); // Generate PIN for new guests by default
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

    if (guest) {
      // Update existing guest
      updateGuest.mutate(
        { guestId: guest.id, resortId, data: formData },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess();
          },
        }
      );
    } else {
      // Create new guest with optional PIN generation
      createGuest.mutate(
        { resortId, data: formData, generatePin },
        {
          onSuccess: (data) => {
            // Show the created modal with credentials
            setCreatedGuest({
              guest: {
                id: data.guest.id,
                full_name: data.guest.full_name,
                room_number: data.guest.room_number,
                check_in_date: data.guest.check_in_date,
                check_out_date: data.guest.check_out_date,
              },
              pin: data.pin,
            });
            onOpenChange(false);
            onSuccess();
          },
        }
      );
    }
  };

  const isLoading = createGuest.isPending || updateGuest.isPending;

  return (
    <>
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

            {/* PIN Generation Option (only for new guests) */}
            {!guest && (
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Generate Portal PIN</p>
                    <p className="text-sm text-muted-foreground">
                      Create a PIN so the guest can log into the guest portal immediately
                    </p>
                  </div>
                </div>
                <Switch
                  checked={generatePin}
                  onCheckedChange={setGeneratePin}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : guest ? 'Update Guest' : 'Add Guest'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Show created guest modal with credentials */}
      {createdGuest && (
        <GuestCreatedModal
          open={!!createdGuest}
          onOpenChange={(open) => !open && setCreatedGuest(null)}
          guest={createdGuest.guest}
          pin={createdGuest.pin}
          resortCode={resortCode}
        />
      )}
    </>
  );
}
