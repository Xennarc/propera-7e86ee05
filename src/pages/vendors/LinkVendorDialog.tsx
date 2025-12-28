import { useState } from 'react';
import { useVendors } from '@/hooks/useVendors';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { useResort } from '@/contexts/ResortContext';

interface LinkVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkVendorDialog({ open, onOpenChange }: LinkVendorDialogProps) {
  const { allVendors, vendors, linkVendor } = useVendors();
  const { currentResort } = useResort();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: '',
    commission_rate_override: '',
    ack_sla_minutes: '120',
    operational_notes: '',
  });

  // Filter out vendors already linked to this resort
  const linkedVendorIds = new Set(vendors.map(v => v.id));
  const availableVendors = allVendors.filter(v => !linkedVendorIds.has(v.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) return;

    setLoading(true);
    try {
      await linkVendor({
        vendor_id: formData.vendor_id,
        commission_rate_override: formData.commission_rate_override
          ? parseFloat(formData.commission_rate_override) / 100
          : null,
        ack_sla_minutes: formData.ack_sla_minutes
          ? parseInt(formData.ack_sla_minutes)
          : null,
        operational_notes: formData.operational_notes || null,
      });
      onOpenChange(false);
      setFormData({
        vendor_id: '',
        commission_rate_override: '',
        ack_sla_minutes: '120',
        operational_notes: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Vendor to Resort</DialogTitle>
          <DialogDescription>
            Connect an existing vendor to {currentResort?.name || 'this resort'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Vendor *</Label>
            <Select
              value={formData.vendor_id}
              onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a vendor" />
              </SelectTrigger>
              <SelectContent>
                {availableVendors.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No vendors available to link
                  </div>
                ) : (
                  availableVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                      {vendor.default_commission_rate && (
                        <span className="text-muted-foreground ml-2">
                          ({(vendor.default_commission_rate * 100).toFixed(0)}%)
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
              placeholder="Leave empty to use vendor default"
            />
            <p className="text-xs text-muted-foreground">
              Override the vendor's default commission rate for this resort
            </p>
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
            <p className="text-xs text-muted-foreground">
              Time vendor has to acknowledge new bookings
            </p>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.vendor_id}>
              {loading ? 'Linking...' : 'Link Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
