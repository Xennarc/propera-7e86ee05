import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ['DIVE', 'EXCURSION', 'WATERSPORT', 'SPA', 'OTHER'] as const;

export default function GuestActivitiesBrowser() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['guest-available-sessions', guest?.guestId, selectedDate, selectedCategory],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
        p_date: selectedDate || null,
        p_category: selectedCategory === 'all' ? null : (selectedCategory as any),
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  // Generate date options within guest stay
  const dateOptions: string[] = [];
  let currentDate = new Date(Math.max(
    new Date(guest.checkInDate).getTime(),
    new Date().getTime()
  ));
  const checkOutDate = new Date(guest.checkOutDate);
  while (currentDate <= checkOutDate) {
    dateOptions.push(currentDate.toISOString().split('T')[0]);
    currentDate = addDays(currentDate, 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activities</h1>
        <p className="text-muted-foreground">Browse and book activities during your stay</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((date) => (
                    <SelectItem key={date} value={date}>
                      {format(parseISO(date), 'EEE, MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : sessions?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No activities available for this date and category.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different date or category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions?.map((session: any) => (
            <Card
              key={session.id}
              className="hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => navigate(`/guest/activities/book/${session.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {session.activity_name}
                      </h3>
                      {session.requires_approval && (
                        <Badge variant="warning">Request Only</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {session.remaining_spots} spots left
                      </span>
                    </div>

                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {session.category}
                      </Badge>
                      <Badge variant="secondary">
                        {session.duration_minutes} min
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
