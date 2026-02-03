import React, { useState } from 'react';
import { useGuestRealtimeContext } from '@/contexts/GuestRealtimeContext';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

// Only show when ?debugRealtime=1 is present
const DEBUG_ENABLED = typeof window !== 'undefined' && 
  new URLSearchParams(window.location.search).get('debugRealtime') === '1';

/**
 * Lightweight debug badge for QA testing unified guest realtime.
 * Only renders when URL has ?debugRealtime=1
 */
export function GuestRealtimeDebugBadge() {
  const [expanded, setExpanded] = useState(true);
  const context = useGuestRealtimeContext();

  // Don't render if debug flag is off or outside context
  if (!DEBUG_ENABLED) {
    return null;
  }

  const unifiedActive = context?.unifiedActive ?? false;
  const channelName = context?.channelName ?? null;
  const lastEvent = context?.lastEvent ?? null;
  const eventCounts = context?.eventCounts ?? {};

  // Truncate channel name for display
  const truncatedChannel = channelName 
    ? channelName.length > 32 
      ? `${channelName.slice(0, 20)}..${channelName.slice(-8)}`
      : channelName
    : 'N/A';

  const eventCountEntries = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);
  const totalEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div
      className={cn(
        'fixed top-16 right-2 z-[9998] font-mono text-xs',
        'bg-black/85 text-green-400 rounded-lg shadow-xl border border-green-600/40',
        'backdrop-blur-sm max-w-[280px]',
        'transition-all duration-200'
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Radio className={cn(
            'h-3.5 w-3.5',
            unifiedActive ? 'text-green-400 animate-pulse' : 'text-red-400'
          )} />
          <span className="font-semibold text-green-300">Realtime Debug</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-green-500" />
        )}
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-green-600/30 pt-2">
          {/* Status row */}
          <div className="flex justify-between items-center">
            <span className="text-green-500/80">Unified:</span>
            <span className={unifiedActive ? 'text-green-400' : 'text-red-400'}>
              {unifiedActive ? '✓ Active' : '✗ Inactive'}
            </span>
          </div>

          {/* Channel name */}
          <div className="flex flex-col gap-0.5">
            <span className="text-green-500/80">Channel:</span>
            <span className="text-green-300 text-[10px] break-all leading-tight">
              {truncatedChannel}
            </span>
          </div>

          {/* Last event */}
          <div className="flex justify-between items-center">
            <span className="text-green-500/80">Last:</span>
            <span className="text-green-300">
              {lastEvent 
                ? `${lastEvent.table} @ ${format(lastEvent.timestamp, 'HH:mm:ss')}`
                : 'No events yet'
              }
            </span>
          </div>

          {/* Event counts */}
          {eventCountEntries.length > 0 && (
            <div className="border-t border-green-600/30 pt-2 mt-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-green-500/80">Events ({totalEvents}):</span>
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {eventCountEntries.map(([table, count]) => (
                  <div key={table} className="flex justify-between items-center text-[10px]">
                    <span className="text-green-400/70 truncate max-w-[160px]">{table}</span>
                    <span className="text-green-300 tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {eventCountEntries.length === 0 && (
            <div className="text-green-500/50 text-center py-1 text-[10px]">
              No events received yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
