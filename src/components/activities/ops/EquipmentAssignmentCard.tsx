/**
 * EquipmentAssignmentCard – Assign equipment bundles with qty steppers.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, Minus } from 'lucide-react';
import { useOpsAssets } from '@/hooks/useOpsAssets';
import {
  useSessionOpsAssets,
  useAssignOpsAsset,
  useUnassignOpsAsset,
  useUpdateOpsAssetQty,
} from '@/hooks/useSessionOpsAssets';

interface Props {
  sessionId: string;
  resortId: string;
}

export function EquipmentAssignmentCard({ sessionId, resortId }: Props) {
  const { data: equipment = [] } = useOpsAssets(resortId, 'equipment');
  const { data: assignments = [] } = useSessionOpsAssets(sessionId);
  const assignAsset = useAssignOpsAsset(sessionId);
  const unassignAsset = useUnassignOpsAsset(sessionId);
  const updateQty = useUpdateOpsAssetQty(sessionId);

  const getAssignment = (assetId: string) =>
    assignments.find(a => a.asset_id === assetId);

  const handleIncrement = (assetId: string, assetName: string) => {
    const existing = getAssignment(assetId);
    if (existing) {
      updateQty.mutate({ assignmentId: existing.id, quantity: existing.quantity + 1 });
    } else {
      assignAsset.mutate({
        resort_id: resortId,
        asset_id: assetId,
        asset_type: 'equipment',
        asset_label: assetName,
        quantity: 1,
      });
    }
  };

  const handleDecrement = (assetId: string) => {
    const existing = getAssignment(assetId);
    if (!existing) return;
    if (existing.quantity <= 1) {
      unassignAsset.mutate(existing.id);
    } else {
      updateQty.mutate({ assignmentId: existing.id, quantity: existing.quantity - 1 });
    }
  };

  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Equipment</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">
            No equipment configured. Add items in resort asset settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Equipment</span>
        </div>

        {equipment.map(item => {
          const assignment = getAssignment(item.id);
          const qty = assignment?.quantity ?? 0;
          return (
            <div key={item.id} className="flex items-center justify-between min-h-[40px]">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{item.name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={qty === 0}
                  onClick={() => handleDecrement(item.id)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-8 text-center text-sm font-medium tabular-nums text-foreground">
                  {qty}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => handleIncrement(item.id, item.name)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
