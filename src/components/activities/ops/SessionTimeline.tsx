/**
 * SessionTimeline – Vertical timeline for session events.
 * Phase 1: static nodes based on session status.
 */
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineNodeStatus = 'done' | 'current' | 'upcoming';

export interface TimelineNode {
  label: string;
  timestamp?: string;
  subtitle?: string;
  status: TimelineNodeStatus;
}

interface SessionTimelineProps {
  nodes: TimelineNode[];
}

export function SessionTimeline({ nodes }: SessionTimelineProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 py-2">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />

      <ul className="space-y-5">
        {nodes.map((node, i) => (
          <li key={i} className="relative flex items-start gap-3">
            {/* Node dot */}
            <span className={cn(
              'absolute -left-6 mt-0.5 flex items-center justify-center h-[22px] w-[22px] rounded-full border-2',
              node.status === 'done' && 'border-success bg-success/15 text-success',
              node.status === 'current' && 'border-primary bg-primary/15 text-primary',
              node.status === 'upcoming' && 'border-border bg-background text-muted-foreground',
            )}>
              {node.status === 'done' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </span>

            <div className="pt-0.5">
              <p className={cn(
                'text-sm font-medium',
                node.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
              )}>
                {node.label}
              </p>
              {node.timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">{node.timestamp}</p>
              )}
              {node.subtitle && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{node.subtitle}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
