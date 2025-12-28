import { useState } from 'react';
import { useVendors } from '@/hooks/useVendors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, MoreHorizontal, Building2, Link2, Mail, Phone, Percent, Search, Users } from 'lucide-react';
import { VendorDialog } from './VendorDialog';
import { LinkVendorDialog } from './LinkVendorDialog';
import { VendorResortSettingsDialog } from './VendorResortSettingsDialog';
import { Vendor, VendorResort } from '@/types/vendor';

export default function VendorsPage() {
  const { vendors, isLoading } = useVendors();
  const [search, setSearch] = useState('');
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<(Vendor & { vendorResort: Partial<VendorResort> }) | null>(null);

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase()) ||
    v.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (vendor: typeof vendors[0]) => {
    setSelectedVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleSettings = (vendor: typeof vendors[0]) => {
    setSelectedVendor(vendor);
    setSettingsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedVendor(null);
    setVendorDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            Manage external operators who fulfill activities at your resort
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
            <Link2 className="mr-2 h-4 w-4" />
            Link Existing Vendor
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Vendor
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors.filter(v => v.status === 'active' && v.vendorResort?.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors.filter(v => v.vendorResort?.status === 'suspended').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Vendors Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search ? 'No vendors match your search' : 'No vendors linked to this resort yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{vendor.name}</div>
                        {vendor.contact_name && (
                          <div className="text-sm text-muted-foreground">{vendor.contact_name}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3 text-muted-foreground" />
                      {vendor.vendorResort?.commission_rate_override
                        ? `${(vendor.vendorResort.commission_rate_override * 100).toFixed(0)}%`
                        : vendor.default_commission_rate
                        ? `${(vendor.default_commission_rate * 100).toFixed(0)}% (default)`
                        : '15% (system)'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                        {vendor.status}
                      </Badge>
                      <Badge variant={vendor.vendorResort?.status === 'approved' ? 'outline' : 'destructive'}>
                        {vendor.vendorResort?.status || 'approved'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vendor.vendorResort?.ack_sla_minutes
                      ? `${vendor.vendorResort.ack_sla_minutes} min`
                      : '120 min'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(vendor)}>
                          Edit Vendor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSettings(vendor)}>
                          Resort Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <VendorDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        vendor={selectedVendor}
      />

      <LinkVendorDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />

      <VendorResortSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        vendor={selectedVendor}
        vendorResortId={selectedVendor?.vendorResort?.id as string}
      />
    </div>
  );
}
