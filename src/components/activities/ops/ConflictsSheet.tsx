/**
 * ConflictsSheet – Bottom sheet listing all session conflicts.
 */
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import type { SessionConflicts } from '@/hooks/useSessionConflicts';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: SessionConflicts;
}

export function ConflictsSheet({ open, onOpenChange, conflicts }: Props) {
  const navigate = useNavigate();
  const all = [
    ...conflicts.conflicting_boats.map(c => ({
      type: 'Boat' as const,
      name: c.name,
      detail: `${c.other_activity_name} ${c.other_start.slice(0, 5)}–${c.other_end.slice(0, 5)}`,
      sessionId: c.other_session_id,
    })),
    ...conflicts.conflicting_staff.map(c => ({
      type: c.role.charAt(0).toUpperCase() + c.role.slice(1) as string,
      name: c.name,
      detail: `${c.other_activity_name} ${c.other_start.slice(0, 5)}–${c.other_end.slice(0, 5)}`,
      sessionId: c.other_session_id,
    })),
    ...conflicts.conflicting_equipment.map(c => ({
      type: 'Equipment' as const,
      name: c.name,
      detail: `${c.other_activity_name} ${c.other_start.slice(0, 5)}–${c.other_end.slice(0, 5)} (qty ${c.other_qty})`,
      sessionId: c.other_session_id,
    })),
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Scheduling Conflicts
          </DrawerTitle>
          <DrawerDescription>
            {all.length} conflict{all.length !== 1 ? 's' : ''} detected with overlapping sessions
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-safe-bottom space-y-2 overflow-y-auto">
          {all.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                onOpenChange(false);
                navigate(`/staff/activities/sessions/${item.sessionId}/ops`);
              }}
              className="w-full flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-left transition-colors hover:bg-warning/10 min-h-[44px]"
            >
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 border-warning/40 text-warning">
                {item.type}
              </Badge>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
