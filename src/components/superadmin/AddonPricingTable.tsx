import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Pencil, Check, X, Package, Shield } from 'lucide-react';
import { format } from 'date-fns';
import {
  type AddonPricingRow,
  formatCentsToDisplay,
  useUpdateAddonPricing,
} from '@/hooks/usePricingManagement';
import {
  type FeatureFlagCategory,
  CATEGORY_METADATA,
  useAddonCategoriesMap,
} from '@/hooks/useAddonEntitlements';
import { AddonEntitlementsSheet } from './AddonEntitlementsSheet';
import { cn } from '@/lib/utils';

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
  originalIsActive: boolean;
}

interface EntitlementSheetState {
  open: boolean;
  addonKey: string;
  addonName: string;
  currentCategories: FeatureFlagCategory[];
  isPaidAddon: boolean;
}

function CategoryChips({
  categories,
  flagCounts,
}: {
  categories: FeatureFlagCategory[];
  flagCounts: Record<FeatureFlagCategory, number>;
}) {
  if (categories.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">No categories</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((cat) => {
        const meta = CATEGORY_METADATA[cat];
        const count = flagCounts[cat] || 0;
        return (
          <Badge
            key={cat}
            variant={meta.variant as any}
            className={cn(
              'text-[10px] px-1.5 py-0',
              cat === 'danger' && 'bg-destructive/10 text-destructive border-destructive/30',
              cat === 'experimental' && 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            )}
          >
            {meta.label} ({count})
          </Badge>
        );
      })}
    </div>
  );
}

export function AddonPricingTable({ addons, isLoading }: AddonPricingTableProps) {
  const [editState, setEditState] = useState<EditState>({
    id: null,
    name: '',
    monthly_price_cents: 0,
    currency: 'USD',
    is_active: true,
    originalIsActive: true,
  });
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [entitlementSheet, setEntitlementSheet] = useState<EntitlementSheetState>({
    open: false,
    addonKey: '',
    addonName: '',
    currentCategories: [],
    isPaidAddon: false,
  });

  const updateAddon = useUpdateAddonPricing();
  const { addonMap, flagCountsByCategory, isLoading: categoriesLoading } = useAddonCategoriesMap();

  const getAddonCategories = (addonKey: string): FeatureFlagCategory[] => {
    return addonMap.get(addonKey)?.categories || [];
  };

  const startEdit = (addon: AddonPricingRow) => {
    setEditState({
      id: addon.id,
      name: addon.name,
      monthly_price_cents: addon.monthly_price_cents,
      currency: addon.currency,
      is_active: addon.is_active,
      originalIsActive: addon.is_active,
    });
  };

  const cancelEdit = () => {
    setEditState({
      id: null,
      name: '',
      monthly_price_cents: 0,
      currency: 'USD',
      is_active: true,
      originalIsActive: true,
    });
  };

  const handleSaveClick = () => {
    if (editState.originalIsActive && !editState.is_active) {
      setConfirmDeactivate(true);
    } else {
      saveEdit();
    }
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

  const openEntitlementSheet = (addon: AddonPricingRow) => {
    setEntitlementSheet({
      open: true,
      addonKey: addon.key,
      addonName: addon.name,
      currentCategories: getAddonCategories(addon.key),
      isPaidAddon: addon.monthly_price_cents > 0,
    });
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
    <>
      {/* Desktop Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-11">
                  Key
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-11">
                  Name
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-11">
                  Included Categories
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-11">
                  Monthly Price
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-11">
                  Currency
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-center h-11">
                  Active
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider h-11">
                  Updated
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right h-11">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((addon) => {
                const isEditing = editState.id === addon.id;
                const categories = getAddonCategories(addon.key);

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
                      {categoriesLoading ? (
                        <Skeleton className="h-5 w-24" />
                      ) : (
                        <CategoryChips
                          categories={categories}
                          flagCounts={flagCountsByCategory}
                        />
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
                      {addon.updated_at ? format(new Date(addon.updated_at), 'MMM d, yyyy') : '-'}
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
                            onClick={handleSaveClick}
                            disabled={updateAddon.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEntitlementSheet(addon)}
                            title="Edit entitlements"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(addon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {addons.map((addon) => {
          const isEditing = editState.id === addon.id;
          const categories = getAddonCategories(addon.key);

          return (
            <div
              key={addon.id}
              className="p-4 rounded-xl border border-border/50 bg-muted/20"
            >
              <div className="flex items-center justify-between mb-3">
                <code className="text-xs bg-muted px-2 py-1 rounded">{addon.key}</code>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEntitlementSheet(addon)}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(addon)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Categories row */}
              <div className="mb-3">
                <span className="text-xs text-muted-foreground block mb-1">
                  Included Categories
                </span>
                {categoriesLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <CategoryChips categories={categories} flagCounts={flagCountsByCategory} />
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input
                      value={editState.name}
                      onChange={(e) => setEditState((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-10 mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Price</label>
                      <Input
                        type="number"
                        value={editState.monthly_price_cents / 100}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="h-10 mt-1"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Currency</label>
                      <Select
                        value={editState.currency}
                        onValueChange={(v) => setEditState((prev) => ({ ...prev, currency: v }))}
                      >
                        <SelectTrigger className="h-10 mt-1">
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
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editState.is_active}
                        onCheckedChange={(v) => setEditState((prev) => ({ ...prev, is_active: v }))}
                      />
                      <span className="text-sm">Active</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveClick} disabled={updateAddon.isPending}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{addon.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">
                      {formatCentsToDisplay(addon.monthly_price_cents, addon.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={addon.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {addon.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deactivation Confirmation */}
      <ConfirmationDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title="Deactivate Add-on"
        description={`You are about to deactivate the "${editState.name}" add-on.`}
        impact="This will hide the add-on from the public pricing page. Existing subscriptions will not be affected."
        confirmLabel="Deactivate"
        variant="warning"
        onConfirm={() => {
          setConfirmDeactivate(false);
          saveEdit();
        }}
        isLoading={updateAddon.isPending}
      />

      {/* Entitlements Sheet */}
      <AddonEntitlementsSheet
        open={entitlementSheet.open}
        onOpenChange={(open) => setEntitlementSheet((prev) => ({ ...prev, open }))}
        addonKey={entitlementSheet.addonKey}
        addonName={entitlementSheet.addonName}
        currentCategories={entitlementSheet.currentCategories}
        isPaidAddon={entitlementSheet.isPaidAddon}
      />
    </>
  );
}
