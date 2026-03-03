/**
 * OpsQuickActionsDrawer – Role-gated inline actions for a session row.
 * Only managers/admins see write actions; everyone else stays read-only.
 */
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  ClipboardCheck,
  Bus,
  Ship,
  Users,
  ExternalLink,
  ChevronRight,
  Lock,
} from 'lucide-react';
import type { OpsSessionRow } from '@/hooks/useDailyOpsSheet';

interface OpsQuickActionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: OpsSessionRow;
}

export function OpsQuickActionsDrawer({ open, onOpenChange, row }: OpsQuickActionsDrawerProps) {
  const navigate = useNavigate();
  const { isSuperAdmin, currentResortRole } = usePermissions();

  const canWrite =
    isSuperAdmin ||
    currentResortRole === 'RESORT_ADMIN' ||
    currentResortRole === 'MANAGER' ||
    currentResortRole === 'ACTIVITIES';

  const canDispatch =
    isSuperAdmin ||
    currentResortRole === 'RESORT_ADMIN' ||
    currentResortRole === 'MANAGER' ||
    currentResortRole === 'TRANSPORT';

  const baseUrl = `/staff/activities/sessions/${row.session_id}/ops`;

  const goAndClose = (url: string) => {
    onOpenChange(false);
    // Small delay to let drawer animate out
    setTimeout(() => navigate(url), 150);
  };

  const hasPickupTrip = !!row.pickup;
  const needsPickup = !row.pickup && row.total_pax > 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-sm">{row.activity_name}</DrawerTitle>
          <DrawerDescription className="text-xs">
            {row.start_time?.slice(0, 5)}–{row.end_time?.slice(0, 5)}
            {row.location ? ` · ${row.location}` : ''}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-safe-bottom space-y-2">
          {/* Always visible: Open Run Sheet */}
          <ActionButton
            icon={ExternalLink}
            label="Open Run Sheet"
            description="Full session operations view"
            onClick={() => goAndClose(baseUrl)}
          />

          {/* Open Check-in — write-gated */}
          {canWrite ? (
            <ActionButton
              icon={ClipboardCheck}
              label="Open Check-in"
              description="Check in guests for this session"
              onClick={() => goAndClose(`${baseUrl}?tab=manifest`)}
            />
          ) : (
            <ActionButton
              icon={ClipboardCheck}
              label="Open Check-in"
              description="View-only — manager required"
              disabled
              locked
            />
          )}

          {/* Generate Pickup Run — write-gated */}
          {needsPickup && (
            canWrite ? (
              <ActionButton
                icon={Bus}
                label="Generate Pickup Run"
                description={`${row.total_pax} guests need pickup`}
                onClick={() => goAndClose(`${baseUrl}?tab=setup&open_pickup=1`)}
              />
            ) : (
              <ActionButton
                icon={Bus}
                label="Generate Pickup Run"
                description="View-only — manager required"
                disabled
                locked
              />
            )
          )}

          {/* View Pickup Trip — visible to dispatchers */}
          {hasPickupTrip && (
            <ActionButton
              icon={Bus}
              label="Open Dispatch Trip"
              description={`Status: ${row.pickup!.status}${row.pickup!.has_driver ? ' · Driver assigned' : ''}`}
              badge={row.pickup!.status}
              onClick={() => {
                if (canDispatch) {
                  goAndClose('/staff/transport');
                } else {
                  goAndClose(baseUrl);
                }
              }}
            />
          )}

          {/* Quick Assign Boat/Crew — write-gated */}
          {canWrite ? (
            <ActionButton
              icon={Ship}
              label="Quick Assign"
              description="Assign boat, crew & equipment"
              onClick={() => goAndClose(`${baseUrl}?tab=setup`)}
            />
          ) : (
            <ActionButton
              icon={Ship}
              label="Quick Assign"
              description="View-only — manager required"
              disabled
              locked
            />
          )}

          {/* View Session Details */}
          <ActionButton
            icon={Users}
            label="View Session Details"
            description="Booking details & schedule"
            onClick={() => goAndClose(`/staff/activities/sessions/${row.session_id}`)}
            variant="ghost"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Internal ActionButton ──────────────────────────────────────

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  locked?: boolean;
  badge?: string;
  variant?: 'default' | 'ghost';
}

function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
  locked,
  badge,
  variant = 'default',
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors min-h-[52px] ${
        disabled
          ? 'border-border/20 bg-muted/30 opacity-60 cursor-not-allowed'
          : variant === 'ghost'
            ? 'border-border/20 bg-transparent hover:bg-muted/30'
            : 'border-border/40 bg-card hover:bg-accent/5 active:bg-accent/10'
      }`}
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
      {badge && (
        <Badge variant="outline" className="text-[10px] shrink-0">
          {badge}
        </Badge>
      )}
      {locked ? (
        <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      )}
    </button>
  );
}
