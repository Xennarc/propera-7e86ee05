/**
 * BoatAssignmentCard – Assign a single boat to a session.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Anchor, Check, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  resortId: string;
}

export function BoatAssignmentCard({ sessionId, resortId }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: boats = [] } = useOpsAssets(resortId, 'boat');
  const { data: assignments = [] } = useSessionOpsAssets(sessionId);
  const assignAsset = useAssignOpsAsset(sessionId);
  const unassignAsset = useUnassignOpsAsset(sessionId);

  const boatAssignment = assignments.find(a => a.asset_type === 'boat');
  const assignedBoat = boatAssignment
    ? boats.find(b => b.id === boatAssignment.asset_id) ?? null
    : null;

  const handleSelect = (boat: OpsAsset) => {
    // Remove old boat assignment if exists
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
                <Badge variant="secondary" className="text-xs font-medium">
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
                return (
                  <button
                    key={boat.id}
                    onClick={() => handleSelect(boat)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors min-h-[44px]',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{boat.name}</p>
                      {boat.capacity_int && (
                        <p className="text-xs text-muted-foreground">Capacity: {boat.capacity_int} pax</p>
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
