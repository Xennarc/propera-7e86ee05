import { useState, useEffect } from 'react';
import { useVendors } from '@/hooks/useVendors';
import { Vendor, VendorResort } from '@/types/vendor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: (Vendor & { vendorResort?: Partial<VendorResort> }) | null;
}

export function VendorDialog({ open, onOpenChange, vendor }: VendorDialogProps) {
  const { createVendor, updateVendor, linkVendor, isCreating, isUpdating } = useVendors();
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    default_commission_rate: '',
    is_active: true,
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        contact_name: vendor.contact_name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        default_commission_rate: vendor.default_commission_rate
          ? (vendor.default_commission_rate * 100).toString()
          : '',
        is_active: vendor.status === 'active',
      });
    } else {
      setFormData({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        default_commission_rate: '15',
        is_active: true,
      });
    }
  }, [vendor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const commissionRate = formData.default_commission_rate
      ? parseFloat(formData.default_commission_rate) / 100
      : null;

    try {
      if (vendor) {
        await updateVendor({
          id: vendor.id,
          name: formData.name,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          default_commission_rate: commissionRate,
          status: formData.is_active ? 'active' : 'inactive',
        });
      } else {
        const newVendor = await createVendor({
          name: formData.name,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          default_commission_rate: commissionRate,
          status: formData.is_active ? 'active' : 'inactive',
        });
        
        // Auto-link to current resort
        await linkVendor({ vendor_id: newVendor.id });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
          <DialogDescription>
            {vendor
              ? 'Update vendor details'
              : 'Create a new vendor and link them to your resort'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Lagoon Legends Watersports"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Person</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="Primary contact name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
              />
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

          <div className="space-y-2">
            <Label htmlFor="commission">Default Commission Rate (%)</Label>
            <Input
              id="commission"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.default_commission_rate}
              onChange={(e) => setFormData({ ...formData, default_commission_rate: e.target.value })}
              placeholder="15"
            />
            <p className="text-xs text-muted-foreground">
              The percentage retained by the resort. Can be overridden per-resort.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive vendors cannot be assigned to new activities
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating || !formData.name.trim()}>
              {isCreating || isUpdating ? 'Saving...' : vendor ? 'Update' : 'Create & Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
