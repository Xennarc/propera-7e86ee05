import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Pencil, Check, X, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { getTierInfo, type SubscriptionTier } from '@/lib/tier-features';
import {
  type PlanPricingRow,
  formatCentsToDisplay,
  useUpdatePlanPricing,
} from '@/hooks/usePricingManagement';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

interface PlanPricingTableProps {
  plans: PlanPricingRow[] | undefined;
  isLoading: boolean;
}

interface EditState {
  id: string | null;
  monthly_price_cents: number;
  currency: string;
  is_active: boolean;
}

export function PlanPricingTable({ plans, isLoading }: PlanPricingTableProps) {
  const [editState, setEditState] = useState<EditState>({
    id: null,
    monthly_price_cents: 0,
    currency: 'USD',
    is_active: true,
  });

  const updatePlan = useUpdatePlanPricing();

  const startEdit = (plan: PlanPricingRow) => {
    setEditState({
      id: plan.id,
      monthly_price_cents: plan.monthly_price_cents,
      currency: plan.currency,
      is_active: plan.is_active,
    });
  };

  const cancelEdit = () => {
    setEditState({ id: null, monthly_price_cents: 0, currency: 'USD', is_active: true });
  };

  const saveEdit = async () => {
    if (!editState.id) return;
    await updatePlan.mutateAsync({
      id: editState.id,
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
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium">No pricing plans found</p>
        <p className="text-sm text-muted-foreground">
          Plans will appear here once configured in the database.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Tier</TableHead>
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
          {plans.map((plan) => {
            const isEditing = editState.id === plan.id;
            const tierInfo = getTierInfo(plan.tier as SubscriptionTier);

            return (
              <TableRow key={plan.id} className="transition-colors">
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`capitalize ${
                      plan.tier === 'ELITE'
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : plan.tier === 'PROFESSIONAL'
                          ? 'bg-info/10 text-info border-info/30'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tierInfo.name}
                  </Badge>
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
                      {formatCentsToDisplay(plan.monthly_price_cents, plan.currency)}
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
                    <span className="text-muted-foreground">{plan.currency}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditing ? (
                    <Switch
                      checked={editState.is_active}
                      onCheckedChange={(v) => setEditState((prev) => ({ ...prev, is_active: v }))}
                    />
                  ) : (
                    <Switch checked={plan.is_active} disabled className="pointer-events-none" />
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {plan.updated_at
                    ? format(new Date(plan.updated_at), 'MMM d, yyyy')
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={updatePlan.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={updatePlan.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(plan)}>
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
