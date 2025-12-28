import { useState, useEffect } from 'react';
import { useVendors } from '@/hooks/useVendors';
import { Vendor, VendorResort } from '@/types/vendor';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useResort } from '@/contexts/ResortContext';
import { Unlink } from 'lucide-react';

interface VendorResortSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: (Vendor & { vendorResort?: Partial<VendorResort> }) | null;
  vendorResortId: string;
}

export function VendorResortSettingsDialog({
  open,
  onOpenChange,
  vendor,
  vendorResortId,
}: VendorResortSettingsDialogProps) {
  const { updateVendorResort, unlinkVendor } = useVendors();
  const { currentResort } = useResort();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    is_approved: true,
    commission_rate_override: '',
    ack_sla_minutes: '120',
    operational_notes: '',
  });

  useEffect(() => {
    if (vendor?.vendorResort) {
      setFormData({
        is_approved: vendor.vendorResort.status === 'approved',
        commission_rate_override: vendor.vendorResort.commission_rate_override
          ? (vendor.vendorResort.commission_rate_override * 100).toString()
          : '',
        ack_sla_minutes: vendor.vendorResort.ack_sla_minutes?.toString() || '120',
        operational_notes: vendor.vendorResort.operational_notes || '',
      });
    }
  }, [vendor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorResortId) return;

    setLoading(true);
    try {
      await updateVendorResort({
        vendor_resort_id: vendorResortId,
        status: formData.is_approved ? 'approved' : 'suspended',
        commission_rate_override: formData.commission_rate_override
          ? parseFloat(formData.commission_rate_override) / 100
          : null,
        ack_sla_minutes: formData.ack_sla_minutes
          ? parseInt(formData.ack_sla_minutes)
          : null,
        operational_notes: formData.operational_notes || null,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!vendorResortId) return;
    setLoading(true);
    try {
      await unlinkVendor(vendorResortId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resort Settings for {vendor.name}</DialogTitle>
          <DialogDescription>
            Configure how {vendor.name} operates at {currentResort?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Approved</Label>
              <p className="text-sm text-muted-foreground">
                Suspended vendors cannot accept new bookings
              </p>
            </div>
            <Switch
              checked={formData.is_approved}
              onCheckedChange={(checked) => setFormData({ ...formData, is_approved: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_override">Commission Override (%)</Label>
            <Input
              id="commission_override"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.commission_rate_override}
              onChange={(e) => setFormData({ ...formData, commission_rate_override: e.target.value })}
              placeholder={
                vendor.default_commission_rate
                  ? `Vendor default: ${(vendor.default_commission_rate * 100).toFixed(0)}%`
                  : 'System default: 15%'
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sla">Acknowledgement SLA (minutes)</Label>
            <Input
              id="sla"
              type="number"
              min="15"
              value={formData.ack_sla_minutes}
              onChange={(e) => setFormData({ ...formData, ack_sla_minutes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Operational Notes</Label>
            <Textarea
              id="notes"
              value={formData.operational_notes}
              onChange={(e) => setFormData({ ...formData, operational_notes: e.target.value })}
              placeholder="e.g. Meeting point, dock location, special instructions..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="w-full sm:w-auto">
                  <Unlink className="mr-2 h-4 w-4" />
                  Unlink Vendor
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlink {vendor.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove {vendor.name} from {currentResort?.name}. Existing bookings
                    will be preserved but no new vendor bookings can be made. This action can be
                    reversed by re-linking the vendor.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
