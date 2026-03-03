/**
 * DepartureCard – Compact session card for the Activities Ops inbox.
 * Mobile-first: radius 16, padding 16, min-height 104.
 */
import { useNavigate } from 'react-router-dom';
import { OpsStatusChip, OpsStatus } from './OpsStatusChip';
import { Users, Clock, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DepartureCardData {
  sessionId: string;
  activityName: string;
  status: OpsStatus;
  startTime: string; // HH:mm
  endTime: string;
  date: string; // YYYY-MM-DD
  location?: string;
  bookedPax: number;
  capacity: number;
}

interface DepartureCardProps {
  data: DepartureCardData;
}

export function DepartureCard({ data }: DepartureCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="rounded-2xl border border-border/40 bg-card p-4 min-h-[104px] flex flex-col gap-2.5 shadow-soft"
    >
      {/* Header: name + chip */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground truncate flex-1">
          {data.activityName}
        </h3>
        <OpsStatusChip status={data.status} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {data.startTime}–{data.endTime}
          {data.location && <span className="ml-1.5">· {data.location}</span>}
        </span>
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {data.bookedPax}/{data.capacity}
        </span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-auto">
        <Button
          className="flex-1 h-12"
          onClick={() => navigate(`/staff/activities/sessions/${data.sessionId}/ops`)}
        >
          Open Run Sheet
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/staff/activities/sessions/${data.sessionId}`)}>
              View Session Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Skeleton variant
export function DepartureCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 min-h-[104px] flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-12 rounded bg-muted" />
      </div>
      <div className="h-12 rounded-xl bg-muted mt-auto" />
    </div>
  );
}
