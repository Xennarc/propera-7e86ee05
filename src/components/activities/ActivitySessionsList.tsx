import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { Calendar, Clock, Users, Plus, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfToday } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Session {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  confirmed_pax?: number;
}

interface ActivitySessionsListProps {
  activityId: string;
  activityName: string;
  resortId: string;
  onClose?: () => void;
}

export function ActivitySessionsList({ activityId, activityName, resortId, onClose }: ActivitySessionsListProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [activityId]);

  const fetchSessions = async () => {
    setLoading(true);
    
    // Fetch sessions with booking counts
    const { data: sessionsData, error } = await supabase
      .from('activity_sessions')
      .select('id, date, start_time, end_time, capacity, status')
      .eq('activity_id', activityId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error || !sessionsData) {
      setLoading(false);
      return;
    }

    // Fetch confirmed booking counts for each session
    const sessionIds = sessionsData.map(s => s.id);
    const { data: bookingsData } = await supabase
      .from('activity_bookings')
      .select('session_id, num_adults, num_children')
      .in('session_id', sessionIds)
      .eq('status', 'CONFIRMED');

    // Calculate confirmed pax per session
    const paxBySession: Record<string, number> = {};
    if (bookingsData) {
      bookingsData.forEach(b => {
        paxBySession[b.session_id] = (paxBySession[b.session_id] || 0) + b.num_adults + b.num_children;
      });
    }

    const sessionsWithPax = sessionsData.map(s => ({
      ...s,
      confirmed_pax: paxBySession[s.id] || 0,
    }));

    setSessions(sessionsWithPax);
    setLoading(false);
  };

  const today = startOfToday();
  const upcomingSessions = sessions.filter(s => 
    s.status === 'SCHEDULED' && !isBefore(parseISO(s.date), today)
  );
  const pastSessions = sessions.filter(s => 
    s.status !== 'SCHEDULED' || isBefore(parseISO(s.date), today)
  );

  const handleNavigateToSession = (sessionId: string) => {
    onClose?.();
    navigate(`/staff/activities/sessions/${sessionId}`);
  };

  const handleCreateSession = () => {
    onClose?.();
    navigate(`/staff/activities/sessions/new?activityId=${activityId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Sessions ({sessions.length})
        </h4>
        <Button size="sm" variant="outline" onClick={handleCreateSession}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
          <p>No sessions created yet</p>
          <Button size="sm" variant="link" onClick={handleCreateSession} className="mt-1">
            Create your first session
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Upcoming ({upcomingSessions.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {upcomingSessions.map(session => (
                  <SessionRow 
                    key={session.id} 
                    session={session} 
                    onNavigate={handleNavigateToSession}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past/Other Sessions */}
          {pastSessions.length > 0 && (
            <Collapsible open={showPast} onOpenChange={setShowPast}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span className="text-xs uppercase tracking-wide">
                    Past & Other ({pastSessions.length})
                  </span>
                  {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pt-2 max-h-48 overflow-y-auto">
                {pastSessions.map(session => (
                  <SessionRow 
                    key={session.id} 
                    session={session} 
                    onNavigate={handleNavigateToSession}
                    isPast
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

function SessionRow({ 
  session, 
  onNavigate, 
  isPast = false 
}: { 
  session: Session; 
  onNavigate: (id: string) => void;
  isPast?: boolean;
}) {
  const occupancy = session.capacity > 0 
    ? Math.round(((session.confirmed_pax || 0) / session.capacity) * 100)
    : 0;
  const isFull = (session.confirmed_pax || 0) >= session.capacity;

  return (
    <button
      onClick={() => onNavigate(session.id)}
      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors hover:bg-muted/50 group ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          <div className={`text-xs font-medium ${isPast ? 'text-muted-foreground' : ''}`}>
            {format(parseISO(session.date), 'MMM d')}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {format(parseISO(session.date), 'EEE')}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className={`text-xs ${isFull ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {session.confirmed_pax || 0}/{session.capacity}
              {isFull && ' (Full)'}
            </span>
            {occupancy > 0 && !isFull && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {occupancy}%
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={session.status} />
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
