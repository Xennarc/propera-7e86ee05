import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useDriverTrips } from '@/hooks/transport/useDriverSession';
import { useTripStops, useTripRequests } from '@/hooks/transport/useTripDetails';
import { getErrors, clearErrors, type CapturedError } from '@/lib/debug-error-capture';
import {
  getPendingQueries,
  getRecentQueries,
  getQueryStats,
  clearQueryHistory,
  getTimingColorClass,
  formatDuration,
  type TrackedQuery,
} from '@/lib/debug-query-tracker';
import type { DriverOutletContext } from '@/components/driver/DriverLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Bug,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  MapPin,
  User,
  Car,
  Database,
  AlertTriangle,
  Zap,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DebugSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: DebugSection[] = [
  { id: 'session', label: 'Session', icon: User },
  { id: 'trip', label: 'Trip', icon: Car },
  { id: 'gps', label: 'GPS', icon: MapPin },
  { id: 'errors', label: 'Errors', icon: AlertTriangle },
  { id: 'queries', label: 'Queries', icon: Database },
];

/**
 * Hook to check if debug mode should be active for the driver portal.
 * Drivers are authorized if they have a valid driver session.
 */
export function useDriverDebugMode() {
  const [searchParams] = useSearchParams();
  const hasDebugParam = searchParams.get('debug') === '1';
  return hasDebugParam;
}

export function DriverDebugConsole() {
  const { user } = useAuth();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  const { driverSession, isOnline, driverLocation } = useOutletContext<DriverOutletContext>();

  const { data: trips = [] } = useDriverTrips(resortId);
  const currentTrip = trips[0];

  const { data: tripStops } = useTripStops(currentTrip?.id);
  const { data: tripRequests } = useTripRequests(currentTrip?.id);

  const [isOpen, setIsOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['session', 'trip']));
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [pendingQueries, setPendingQueries] = useState<TrackedQuery[]>([]);
  const [recentQueries, setRecentQueries] = useState<TrackedQuery[]>([]);

  // Refresh errors and queries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setErrors(getErrors());
      setPendingQueries(getPendingQueries());
      setRecentQueries(getRecentQueries());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const queryStats = useMemo(() => getQueryStats(), [recentQueries]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyDebugData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      user_id: user?.id,
      resort_id: resortId,
      driver_session: driverSession ? {
        id: driverSession.id,
        status: driverSession.status,
        buggy_id: driverSession.assigned_buggy_id,
        buggy_name: driverSession.assigned_buggy?.name,
      } : null,
      current_trip: currentTrip ? {
        id: currentTrip.id,
        status: currentTrip.status,
        lifecycle_state: currentTrip.lifecycle_state,
        stops_count: tripStops?.length ?? 0,
        requests_count: tripRequests?.length ?? 0,
      } : null,
      gps: driverLocation,
      online: isOnline,
      errors: errors.map(e => ({ message: e.message, type: e.type, time: e.timestamp })),
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Debug data copied to clipboard');
  }, [user, resortId, driverSession, currentTrip, tripStops, tripRequests, driverLocation, isOnline, errors]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg"
      >
        <Bug className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] max-h-[60vh] overflow-y-auto bg-background/95 backdrop-blur border-t-2 border-amber-500 shadow-2xl text-xs font-mono">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-amber-500" />
          <span className="font-bold text-amber-500">Driver Debug</span>
          {errors.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0">{errors.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyDebugData}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border">
        {SECTIONS.map(section => {
          const isExpanded = expandedSections.has(section.id);
          const Icon = section.icon;
          return (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">{section.label}</span>
                  {section.id === 'errors' && errors.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">{errors.length}</Badge>
                  )}
                  {section.id === 'queries' && pendingQueries.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">{pendingQueries.length} pending</Badge>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 space-y-1">
                  {section.id === 'session' && (
                    <>
                      <DebugRow label="user_id" value={user?.id || '—'} />
                      <DebugRow label="email" value={user?.email || '—'} />
                      <DebugRow label="resort_id" value={resortId || '—'} />
                      <DebugRow label="resort_name" value={currentResort?.name || '—'} />
                      <DebugRow label="driver_id" value={driverSession?.id || '—'} />
                      <DebugRow label="status" value={driverSession?.status || '—'} />
                      <DebugRow label="buggy_id" value={driverSession?.assigned_buggy_id || '—'} />
                      <DebugRow label="buggy_name" value={driverSession?.assigned_buggy?.name || '—'} />
                      <DebugRow label="last_seen" value={driverSession?.last_seen_at || '—'} />
                      <DebugRow label="online" value={isOnline ? '✅ Yes' : '❌ No'} />
                    </>
                  )}

                  {section.id === 'trip' && (
                    <>
                      {currentTrip ? (
                        <>
                          <DebugRow label="trip_id" value={currentTrip.id} />
                          <DebugRow label="status" value={currentTrip.status} />
                          <DebugRow label="lifecycle_state" value={currentTrip.lifecycle_state || '(null)'} />
                          <DebugRow label="trip_type" value={currentTrip.trip_type} />
                          <DebugRow label="buggy_id" value={currentTrip.buggy_id || '—'} />
                          <DebugRow label="driver_user_id" value={currentTrip.driver_user_id || '—'} />
                          <DebugRow label="stops_count" value={String(tripStops?.length ?? '?')} />
                          <DebugRow label="requests_count" value={String(tripRequests?.length ?? '?')} />
                          <DebugRow label="total_pax" value={String(tripRequests?.reduce((s, r) => s + r.party_size, 0) ?? '?')} />
                          <DebugRow label="start_at" value={currentTrip.start_at || '—'} />
                          <DebugRow label="created_at" value={currentTrip.created_at} />
                          
                          {/* Stops detail */}
                          {tripStops && tripStops.length > 0 && (
                            <div className="mt-1 pt-1 border-t border-border/50">
                              <p className="text-muted-foreground mb-1">Stops:</p>
                              {tripStops.map(s => (
                                <div key={s.id} className="flex gap-2 text-[10px] pl-2">
                                  <span className="text-muted-foreground">#{s.sequence}</span>
                                  <span>{s.stop_kind}</span>
                                  <span className="truncate">{s.stop_name || s.title || '—'}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{s.status}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Requests detail */}
                          {tripRequests && tripRequests.length > 0 && (
                            <div className="mt-1 pt-1 border-t border-border/50">
                              <p className="text-muted-foreground mb-1">Requests:</p>
                              {tripRequests.map(r => (
                                <div key={r.id} className="flex gap-2 text-[10px] pl-2">
                                  <span className="truncate">{r.guest_name || '—'}</span>
                                  <span>{r.party_size}pax</span>
                                  <span className="truncate text-muted-foreground">{r.pickup_name} → {r.dropoff_name}</span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{r.state}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground italic">No active trip</p>
                      )}
                    </>
                  )}

                  {section.id === 'gps' && (
                    <>
                      <DebugRow label="lat" value={driverLocation?.lat?.toFixed(6) || '—'} />
                      <DebugRow label="lng" value={driverLocation?.lng?.toFixed(6) || '—'} />
                      <DebugRow label="has_location" value={driverLocation ? '✅ Yes' : '❌ No'} />
                    </>
                  )}

                  {section.id === 'errors' && (
                    <>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => { clearErrors(); setErrors([]); }}>
                          <Trash2 className="h-3 w-3" /> Clear
                        </Button>
                      </div>
                      {errors.length === 0 ? (
                        <p className="text-muted-foreground italic">No errors captured</p>
                      ) : (
                        errors.map((err, i) => (
                          <div key={i} className="p-1.5 rounded bg-destructive/10 border border-destructive/20">
                            <div className="flex items-center gap-1 text-destructive">
                              <Badge variant="outline" className="text-[9px] px-1 py-0">{err.type}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {err.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="mt-0.5 break-all">{err.message}</p>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {section.id === 'queries' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          avg: {queryStats.avgDuration}ms | slow: {queryStats.slowCount}/{queryStats.totalCount}
                        </span>
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => { clearQueryHistory(); setRecentQueries([]); }}>
                          <Trash2 className="h-3 w-3" /> Clear
                        </Button>
                      </div>
                      {pendingQueries.length > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-amber-500 font-semibold">Pending:</p>
                          {pendingQueries.map((q, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-amber-500 animate-pulse" />
                              <span className="truncate">{q.keyString}</span>
                              <span className="text-amber-500 ml-auto">{formatDuration(q.duration || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {recentQueries.slice(0, 10).map((q, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={cn(
                            "shrink-0",
                            q.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                          )}>
                            {q.status === 'error' ? '✗' : '✓'}
                          </span>
                          <span className="truncate">{q.keyString}</span>
                          {q.duration !== undefined && (
                            <span className={cn("ml-auto shrink-0", getTimingColorClass(q.duration))}>
                              {formatDuration(q.duration)}
                            </span>
                          )}
                        </div>
                      ))}
                      {recentQueries.length === 0 && pendingQueries.length === 0 && (
                        <p className="text-muted-foreground italic">No queries tracked yet</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground shrink-0 w-28">{label}:</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
