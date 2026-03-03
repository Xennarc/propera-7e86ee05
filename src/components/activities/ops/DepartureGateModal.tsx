/**
 * DepartureGateModal – Shown when "Mark Departed" is blocked by unmet compliance.
 * Lists blockers with quick-fix actions and an optional manager override.
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, HeartPulse, ShieldAlert, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export interface DepartureBlocker {
  bookingId: string;
  guestName: string;
  reason: 'cert_unverified' | 'medical_pending' | 'medical_followup';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockers: DepartureBlocker[];
  canOverride: boolean;
  overriding: boolean;
  onOverride: () => void;
  onFixCert: (bookingId: string) => void;
  onFixMedical: (bookingId: string) => void;
}

const REASON_CONFIG: Record<DepartureBlocker['reason'], { label: string; icon: typeof Award; className: string }> = {
  cert_unverified: { label: 'Cert not verified', icon: Award, className: 'bg-warning/15 text-warning border-warning/30' },
  medical_pending: { label: 'Medical pending', icon: HeartPulse, className: 'bg-warning/15 text-warning border-warning/30' },
  medical_followup: { label: 'Medical follow-up', icon: HeartPulse, className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export function DepartureGateModal({
  open,
  onOpenChange,
  blockers,
  canOverride,
  overriding,
  onOverride,
  onFixCert,
  onFixMedical,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Can't depart yet
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blockers.length} guest{blockers.length !== 1 ? 's' : ''} ha{blockers.length !== 1 ? 've' : 's'} unresolved compliance items.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[40vh] overflow-y-auto space-y-2 py-2">
          {blockers.map((b, i) => {
            const cfg = REASON_CONFIG[b.reason];
            const Icon = cfg.icon;
            const isCert = b.reason === 'cert_unverified';
            return (
              <div
                key={`${b.bookingId}-${b.reason}-${i}`}
                className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{b.guestName}</p>
                  <Badge variant="outline" className={`text-[10px] mt-1 ${cfg.className}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 shrink-0 text-xs"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => isCert ? onFixCert(b.bookingId) : onFixMedical(b.bookingId), 150);
                  }}
                >
                  {isCert ? 'Verify' : 'Review'}
                </Button>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogCancel className="w-full">Go back</AlertDialogCancel>
          {canOverride && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onOverride}
              disabled={overriding}
            >
              {overriding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Override and depart
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
