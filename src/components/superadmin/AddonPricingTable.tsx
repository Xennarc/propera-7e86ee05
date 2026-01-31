import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Check, X, Package } from 'lucide-react';
import { format } from 'date-fns';
import {
  type AddonPricingRow,
  formatCentsToDisplay,
  useUpdateAddonPricing,
} from '@/hooks/usePricingManagement';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

interface AddonPricingTableProps {
  addons: AddonPricingRow[] | undefined;
  isLoading: boolean;
}

interface EditState {
  id: string | null;
  name: string;
  monthly_price_cents: number;
  currency: string;
  is_active: boolean;
}

export function AddonPricingTable({ addons, isLoading }: AddonPricingTableProps) {
  const [editState, setEditState] = useState<EditState>({
    id: null,
    name: '',
    monthly_price_cents: 0,
    currency: 'USD',
    is_active: true,
  });

  const updateAddon = useUpdateAddonPricing();

  const startEdit = (addon: AddonPricingRow) => {
    setEditState({
      id: addon.id,
      name: addon.name,
      monthly_price_cents: addon.monthly_price_cents,
      currency: addon.currency,
      is_active: addon.is_active,
    });
  };

  const cancelEdit = () => {
    setEditState({ id: null, name: '', monthly_price_cents: 0, currency: 'USD', is_active: true });
  };

  const saveEdit = async () => {
    if (!editState.id) return;
    await updateAddon.mutateAsync({
      id: editState.id,
      name: editState.name,
      monthly_price_cents: editState.monthly_price_cents,
      currency: editState.currency,
      is_active: editState.is_active,
    });
    cancelEdit();
  };

  const handlePriceChange = (value: string) => {
    const dollars = parseFloat(value) || 0;
    setEditState((prev) => ({ ...prev, monthly_price_cents: Math.round(dollars * 100) }));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!addons || addons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium">No add-ons found</p>
        <p className="text-sm text-muted-foreground">
          Add-ons will appear here once configured in the database.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Key</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Name</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">
              Monthly Price
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">
              Currency
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">
              Active
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">
              Updated
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addons.map((addon) => {
            const isEditing = editState.id === addon.id;

            return (
              <TableRow key={addon.id} className="transition-colors">
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{addon.key}</code>
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editState.name}
                      onChange={(e) =>
                        setEditState((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-48 h-9"
                    />
                  ) : (
                    <span className="font-medium">{addon.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editState.monthly_price_cents / 100}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="w-28 h-9"
                      min={0}
                      step={1}
                    />
                  ) : (
                    <span className="font-medium">
                      {formatCentsToDisplay(addon.monthly_price_cents, addon.currency)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={editState.currency}
                      onValueChange={(v) => setEditState((prev) => ({ ...prev, currency: v }))}
                    >
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{addon.currency}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditing ? (
                    <Switch
                      checked={editState.is_active}
                      onCheckedChange={(v) => setEditState((prev) => ({ ...prev, is_active: v }))}
                    />
                  ) : (
                    <Switch checked={addon.is_active} disabled className="pointer-events-none" />
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {addon.updated_at
                    ? format(new Date(addon.updated_at), 'MMM d, yyyy')
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={updateAddon.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={updateAddon.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(addon)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
