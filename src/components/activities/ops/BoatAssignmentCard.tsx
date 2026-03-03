/**
 * BoatAssignmentCard – Assign a single boat to a session with conflict badges.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Anchor, Check, X, AlertTriangle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useOpsAssets } from '@/hooks/useOpsAssets';
import { useSessionOpsAssets, useAssignOpsAsset, useUnassignOpsAsset } from '@/hooks/useSessionOpsAssets';
import type { OpsAsset } from '@/types/ops';
import type { BoatConflict } from '@/hooks/useSessionConflicts';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  resortId: string;
  boatConflicts?: BoatConflict[];
}

export function BoatAssignmentCard({ sessionId, resortId, boatConflicts = [] }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: boats = [] } = useOpsAssets(resortId, 'boat');
  const { data: assignments = [] } = useSessionOpsAssets(sessionId);
  const assignAsset = useAssignOpsAsset(sessionId);
  const unassignAsset = useUnassignOpsAsset(sessionId);

  const boatAssignment = assignments.find(a => a.asset_type === 'boat');
  const assignedBoat = boatAssignment
    ? boats.find(b => b.id === boatAssignment.asset_id) ?? null
    : null;

  const hasConflict = boatConflicts.some(c => c.asset_id === boatAssignment?.asset_id);

  const isBoatConflicting = (boatId: string) =>
    boatConflicts.some(c => c.asset_id === boatId);

  const getConflictDetail = (boatId: string) => {
    const c = boatConflicts.find(cf => cf.asset_id === boatId);
    if (!c) return null;
    return `${c.other_activity_name} ${c.other_start.slice(0, 5)}–${c.other_end.slice(0, 5)}`;
  };

  const handleSelect = (boat: OpsAsset) => {
    if (boatAssignment) {
      unassignAsset.mutate(boatAssignment.id, {
        onSuccess: () => {
          assignAsset.mutate({
            resort_id: resortId,
            asset_id: boat.id,
            asset_type: 'boat',
            asset_label: boat.name,
            quantity: 1,
          });
        },
      });
    } else {
      assignAsset.mutate({
        resort_id: resortId,
        asset_id: boat.id,
        asset_type: 'boat',
        asset_label: boat.name,
        quantity: 1,
      });
    }
    setPickerOpen(false);
  };

  const handleRemove = () => {
    if (boatAssignment) unassignAsset.mutate(boatAssignment.id);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Boat</span>
            </div>
            {assignedBoat ? (
              <div className="flex items-center gap-2">
                <Badge
                  variant={hasConflict ? 'destructive' : 'secondary'}
                  className="text-xs font-medium"
                >
                  {hasConflict && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {assignedBoat.name}
                  {assignedBoat.capacity_int && (
                    <span className="ml-1 opacity-60">({assignedBoat.capacity_int} pax)</span>
                  )}
                </Badge>
                <button
                  onClick={handleRemove}
                  className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPickerOpen(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPickerOpen(true)}>
                Assign
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>Select Boat</DrawerTitle>
            <DrawerDescription>Choose a boat for this session</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1.5 overflow-y-auto">
            {boats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No boats configured. Add boats in resort asset settings.
              </p>
            ) : (
              boats.map(boat => {
                const isSelected = assignedBoat?.id === boat.id;
                const conflicting = isBoatConflicting(boat.id);
                const conflictText = getConflictDetail(boat.id);
                return (
                  <button
                    key={boat.id}
                    onClick={() => handleSelect(boat)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors min-h-[44px]',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : conflicting
                        ? 'border-warning/40 bg-warning/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">{boat.name}</p>
                        {conflicting && (
                          <Badge variant="outline" className="text-[10px] border-warning/40 text-warning px-1.5 py-0">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                            Conflict
                          </Badge>
                        )}
                      </div>
                      {boat.capacity_int && (
                        <p className="text-xs text-muted-foreground">Capacity: {boat.capacity_int} pax</p>
                      )}
                      {conflictText && (
                        <p className="text-[11px] text-warning mt-0.5">{conflictText}</p>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
