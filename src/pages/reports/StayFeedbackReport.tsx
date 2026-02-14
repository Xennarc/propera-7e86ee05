import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, Download, MessageSquare, Users } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { DateRangePresets } from '@/components/reports/DateRangePresets';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';

interface StayFeedbackRow {
  id: string;
  room_number: string;
  check_out_date: string;
  overall_rating: number;
  rating_activities: number | null;
  rating_diving: number | null;
  rating_fnb: number | null;
  rating_room: number | null;
  rating_service: number | null;
  would_recommend: string;
  highlight_comment: string | null;
  improvement_comment: string | null;
  source: string;
  created_at: string;
  guest: {
    nationality: string | null;
  } | null;
}

export default function StayFeedbackReport() {
  const { currentResort } = useResort();
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['stay-feedback-report', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('stay_feedback')
        .select(`
          id, room_number, check_out_date, overall_rating,
          rating_activities, rating_diving, rating_fnb, rating_room, rating_service,
          would_recommend, highlight_comment, improvement_comment, source, created_at,
          guest:guests(nationality)
        `)
        .eq('resort_id', currentResort.id)
        .gte('check_out_date', startDate)
        .lte('check_out_date', endDate)
        .order('check_out_date', { ascending: false });

      if (error) throw error;
      return (data || []) as StayFeedbackRow[];
    },
    enabled: !!currentResort,
  });

  // Calculate summary stats
  const totalResponses = feedback?.length || 0;
  const avgOverall = totalResponses > 0 
    ? (feedback!.reduce((sum, f) => sum + f.overall_rating, 0) / totalResponses).toFixed(1)
    : '-';

  const calculateAvg = (key: keyof StayFeedbackRow) => {
    if (!feedback) return '-';
    const values = feedback.filter(f => f[key] !== null).map(f => f[key] as number);
    return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-';
  };

  const recommendYesCount = feedback?.filter(f => f.would_recommend === 'YES').length || 0;
  const recommendPercentage = totalResponses > 0 
    ? Math.round((recommendYesCount / totalResponses) * 100)
    : 0;

  // Rating distribution for chart
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating}★`,
    count: feedback?.filter(f => f.overall_rating === rating).length || 0,
  }));

  // Trend data (group by week or month)
  const trendData = feedback?.reduce((acc, f) => {
    const week = format(parseISO(f.check_out_date), 'MMM d');
    const existing = acc.find(a => a.period === week);
    if (existing) {
      existing.total += f.overall_rating;
      existing.count += 1;
      existing.avg = Number((existing.total / existing.count).toFixed(1));
    } else {
      acc.push({ period: week, total: f.overall_rating, count: 1, avg: f.overall_rating });
    }
    return acc;
  }, [] as { period: string; total: number; count: number; avg: number }[]) || [];

  // Export to CSV
  const exportCSV = () => {
    if (!feedback?.length) return;
    
    const headers = ['Check-out Date', 'Room', 'Nationality', 'Overall', 'Activities', 'Diving', 'F&B', 'Room', 'Service', 'Would Recommend', 'Source', 'Highlights', 'Improvements'];
    const rows = feedback.map(f => [
      f.check_out_date,
      f.room_number,
      f.guest?.nationality || '',
      f.overall_rating,
      f.rating_activities || '',
      f.rating_diving || '',
      f.rating_fnb || '',
      f.rating_room || '',
      f.rating_service || '',
      f.would_recommend,
      f.source,
      `"${(f.highlight_comment || '').replace(/"/g, '""')}"`,
      `"${(f.improvement_comment || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stay-feedback-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  if (!currentResort) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a resort to view reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">End-of-Stay Feedback</h1>
          <p className="text-muted-foreground">Guest satisfaction and feedback analysis</p>
        </div>
        <Button onClick={exportCSV} disabled={!feedback?.length} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Presets */}
      <Card>
        <CardContent className="pt-6">
          <DateRangePresets
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <KpiGrid columns="grid-cols-2 md:grid-cols-4" maxWidth="full">
        <KpiCard
          label="Total Responses"
          value={totalResponses}
          icon={MessageSquare}
        />
        <KpiCard
          label="Avg Overall Rating"
          value={avgOverall}
          icon={Star}
          variant={Number(avgOverall) >= 4 ? 'success' : Number(avgOverall) >= 3 ? 'warning' : 'destructive'}
        />
        <KpiCard
          label="Would Recommend"
          value={`${recommendPercentage}%`}
          icon={ThumbsUp}
          variant={recommendPercentage >= 80 ? 'success' : recommendPercentage >= 60 ? 'warning' : 'destructive'}
        />
        <KpiCard
          label="Response Rate"
          value="-"
          helperText="N/A"
          icon={Users}
        />
      </KpiGrid>

      {/* Category Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Activities</p>
              <p className="text-xl font-bold">{calculateAvg('rating_activities')}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Diving</p>
              <p className="text-xl font-bold">{calculateAvg('rating_diving')}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Food & Beverage</p>
              <p className="text-xl font-bold">{calculateAvg('rating_fnb')}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Room</p>
              <p className="text-xl font-bold">{calculateAvg('rating_room')}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Service</p>
              <p className="text-xl font-bold">{calculateAvg('rating_service')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {totalResponses > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="rating" stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rating Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[1, 5]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : feedback?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No feedback in selected date range</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Recommend</TableHead>
                    <TableHead>Highlights</TableHead>
                    <TableHead>Improvements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(f.check_out_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-mono">{f.room_number}</TableCell>
                      <TableCell>{f.guest?.nationality || '-'}</TableCell>
                      <TableCell>{renderStars(f.overall_rating)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          f.would_recommend === 'YES' ? 'confirmed' :
                          f.would_recommend === 'NO' ? 'cancelled' : 'outline'
                        }>
                          {f.would_recommend}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={f.highlight_comment || ''}>
                        {f.highlight_comment || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={f.improvement_comment || ''}>
                        {f.improvement_comment || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AIInsightsPanel
        reportType="feedback"
        reportData={{
          totalResponses,
          avgOverall,
          recommendPercentage,
          categoryAverages: {
            activities: calculateAvg('rating_activities'),
            diving: calculateAvg('rating_diving'),
            fnb: calculateAvg('rating_fnb'),
            room: calculateAvg('rating_room'),
            service: calculateAvg('rating_service'),
          },
          ratingDistribution,
        }}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
