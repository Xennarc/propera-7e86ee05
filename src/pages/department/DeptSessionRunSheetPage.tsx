/**
 * DeptSessionRunSheetPage – Department-scoped session run sheet.
 * Fetches session data filtered by department context and renders
 * manifest + setup tabs with department-level guards.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, ActivitySession, ActivityBooking, Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { StatusChip } from '@/components/ui/status-chip';
import { SkeletonCardList } from '@/components/ui/skeleton-card';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Users, RefreshCw } from 'lucide-react';

function DeptSessionRunSheetContent() {
  const { sessionId, deptKey } = useParams<{ sessionId: string; deptKey: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentDepartment, hasModule } = useDepartment();

  const [session, setSession] = useState<(ActivitySession & { activity?: Activity }) | null>(null);
  const [bookings, setBookings] = useState<(ActivityBooking & { guest?: Guest })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manifest');

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const { data: sessionData, error } = await supabase
        .from('activity_sessions')
        .select(`
          *,
          activity:activities(*)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(sessionData as any);

      const { data: bookingData } = await supabase
        .from('activity_bookings')
        .select(`
          *,
          guest:guests(*)
        `)
        .eq('session_id', sessionId)
        .in('status', ['CONFIRMED', 'PENDING'])
        .order('created_at');

      setBookings((bookingData ?? []) as any);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load session', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [sessionId, toast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const totalPax = useMemo(() => 
    bookings.reduce((sum, b) => sum + b.num_adults + b.num_children, 0),
    [bookings]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <SkeletonCardList count={4} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Session not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/dept/${deptKey}/planner`)}>
          Back to Planner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">{session.activity?.name}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(parseISO(session.date), 'EEE, MMM d')}</span>
            <span>·</span>
            <span>{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</span>
            <StatusChip status={session.status} />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchSession}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3">
        <Card className="flex-1">
          <CardContent className="py-3 px-4 text-center">
            <div className="text-lg font-bold">{totalPax}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Guests</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-3 px-4 text-center">
            <div className="text-lg font-bold">{bookings.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Bookings</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-3 px-4 text-center">
            <div className="text-lg font-bold">{session.capacity - totalPax}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <SegmentedTabs
        tabs={[
          { key: 'manifest', label: 'Manifest' },
          { key: 'setup', label: 'Setup' },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Manifest tab */}
      {activeTab === 'manifest' && (
        <div className="space-y-2">
          {bookings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No bookings for this session.</p>
              </CardContent>
            </Card>
          ) : (
            bookings.map(booking => (
              <Card key={booking.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {booking.guest?.full_name ?? 'Unknown Guest'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Room {booking.room_number} · {booking.num_adults}A{booking.num_children > 0 ? ` ${booking.num_children}C` : ''}
                    </div>
                  </div>
                  <StatusChip status={booking.status} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Setup tab */}
      {activeTab === 'setup' && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">
              Resource assignments and crew setup will be displayed here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DeptSessionRunSheetPage() {
  return (
    <DepartmentGuard moduleKey="session_run_sheet">
      <DeptSessionRunSheetContent />
    </DepartmentGuard>
  );
}
