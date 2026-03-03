/**
 * GuestReadinessRow – Guest card for the manifest tab.
 * Radius 14, padding 12, min-height 72.
 */
import { OpsStatusChip, OpsStatus } from './OpsStatusChip';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShieldCheck,
  HeartPulse,
  Award,
  Ruler,
  HelpCircle,
  UserCheck,
  Eye,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ReadinessState = true | false | null; // done | missing | unknown

export interface GuestReadinessData {
  bookingId: string;
  guestName: string;
  roomNumber: string;
  partySize: number;
  isVip: boolean;
  bookingStatus: string;
  waiver: ReadinessState;
  medical: ReadinessState;
  cert: ReadinessState;
  gear: ReadinessState;
}

interface GuestReadinessRowProps {
  data: GuestReadinessData;
  checkInOpen: boolean;
  onMarkArrived?: (bookingId: string) => void;
  onMoveSession?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
}

const READINESS_ICONS = [
  { key: 'waiver' as const, label: 'Waiver', Icon: ShieldCheck },
  { key: 'medical' as const, label: 'Medical', Icon: HeartPulse },
  { key: 'cert' as const, label: 'Cert', Icon: Award },
  { key: 'gear' as const, label: 'Gear', Icon: Ruler },
];

function ReadinessIcon({ state, Icon, label }: { state: ReadinessState; Icon: typeof ShieldCheck; label: string }) {
  return (
    <span
      title={`${label}: ${state === null ? 'Unknown' : state ? 'Done' : 'Missing'}`}
      className={cn(
        'flex items-center justify-center h-7 w-7 rounded-md',
        state === true && 'bg-success/15 text-success',
        state === false && 'bg-warning/15 text-warning',
        state === null && 'bg-muted/60 text-muted-foreground/50',
      )}
    >
      {state === null ? <HelpCircle className="h-3.5 w-3.5" /> : state === false ? <AlertTriangle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
    </span>
  );
}

export function GuestReadinessRow({ data, checkInOpen, onMarkArrived, onMoveSession, onCancel }: GuestReadinessRowProps) {
  const readiness = { waiver: data.waiver, medical: data.medical, cert: data.cert, gear: data.gear };

  return (
    <div className="rounded-[14px] border border-border/40 bg-card p-3 min-h-[72px] flex items-center gap-3">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground truncate">{data.guestName}</p>
          {data.isVip && (
            <span className="text-[10px] font-semibold px-1 py-0 rounded border border-warning/40 text-warning bg-warning/10 leading-tight">
              VIP
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Room {data.roomNumber} · {data.partySize} pax
        </p>
      </div>

      {/* Readiness grid 2x2 */}
      <div className="grid grid-cols-2 gap-0.5 shrink-0">
        {READINESS_ICONS.map(({ key, label, Icon }) => (
          <ReadinessIcon key={key} state={readiness[key]} Icon={Icon} label={label} />
        ))}
      </div>

      {/* Quick action */}
      {checkInOpen && data.bookingStatus === 'CONFIRMED' && onMarkArrived ? (
        <Button
          size="sm"
          className="h-11 px-3 shrink-0"
          onClick={() => onMarkArrived(data.bookingId)}
        >
          <UserCheck className="h-4 w-4 mr-1" />
          Arrived
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-11 px-3 shrink-0">
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {/* Kebab */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-muted/50 shrink-0 transition-colors">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onMoveSession && (
            <DropdownMenuItem onClick={() => onMoveSession(data.bookingId)}>
              Move Session
            </DropdownMenuItem>
          )}
          {onCancel && data.bookingStatus !== 'CANCELLED' && (
            <DropdownMenuItem className="text-destructive" onClick={() => onCancel(data.bookingId)}>
              Cancel Booking
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>Notes</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function GuestReadinessRowSkeleton() {
  return (
    <div className="rounded-[14px] border border-border/40 bg-card p-3 min-h-[72px] flex items-center gap-3 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-7 w-7 rounded-md bg-muted" />)}
      </div>
      <div className="h-11 w-16 rounded-xl bg-muted" />
    </div>
  );
}
