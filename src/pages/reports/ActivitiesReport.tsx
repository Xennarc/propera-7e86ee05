import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function ActivitiesReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedActivity, setSelectedActivity] = useState<string>('all');

  // Fetch activities for filter
  const { data: activities } = useQuery({
    queryKey: ['activities', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('id, name')
        .eq('resort_id', currentResort.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentResort,
  });

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['activities-report', currentResort?.id, startDate, endDate, selectedActivity],
    queryFn: async () => {
      if (!currentResort) return null;

      // Fetch sessions with bookings
      let sessionsQuery = supabase
        .from('activity_sessions')
        .select(`
          id,
          date,
          capacity,
          activity_id,
          activities!inner(id, name),
          activity_bookings(
            id,
            status,
            num_adults,
            num_children,
            total_amount
          )
        `)
        .eq('resort_id', currentResort.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (selectedActivity !== 'all') {
        sessionsQuery = sessionsQuery.eq('activity_id', selectedActivity);
      }

      const { data: sessions, error } = await sessionsQuery;
      if (error) throw error;

      // Aggregate data
      const activityMap = new Map<string, {
        name: string;
        totalSessions: number;
        totalCapacity: number;
        confirmedPax: number;
        totalRevenue: number;
        noShowCount: number;
        confirmedAndNoShowCount: number;
      }>();

      let totalSessions = 0;
      let totalPax = 0;
      let totalRevenue = 0;
      let totalCapacity = 0;

      sessions?.forEach((session: any) => {
        const activityName = session.activities?.name || 'Unknown';
        const activityId = session.activity_id;

        if (!activityMap.has(activityId)) {
          activityMap.set(activityId, {
            name: activityName,
            totalSessions: 0,
            totalCapacity: 0,
            confirmedPax: 0,
            totalRevenue: 0,
            noShowCount: 0,
            confirmedAndNoShowCount: 0,
          });
        }

        const stats = activityMap.get(activityId)!;
        stats.totalSessions += 1;
        stats.totalCapacity += session.capacity;
        totalSessions += 1;
        totalCapacity += session.capacity;

        session.activity_bookings?.forEach((booking: any) => {
          const pax = (booking.num_adults || 0) + (booking.num_children || 0);
          
          if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
            stats.confirmedPax += pax;
            stats.totalRevenue += booking.total_amount || 0;
            stats.confirmedAndNoShowCount += 1;
            totalPax += pax;
            totalRevenue += booking.total_amount || 0;
          } else if (booking.status === 'NO_SHOW') {
            stats.noShowCount += 1;
            stats.confirmedAndNoShowCount += 1;
          }
        });
      });

      const activityStats = Array.from(activityMap.values()).map(stats => ({
        ...stats,
        avgOccupancy: stats.totalCapacity > 0 
          ? Math.round((stats.confirmedPax / stats.totalCapacity) * 100) 
          : 0,
        noShowPercent: stats.confirmedAndNoShowCount > 0
          ? Math.round((stats.noShowCount / stats.confirmedAndNoShowCount) * 100)
          : 0,
      }));

      const avgOccupancy = totalCapacity > 0 
        ? Math.round((totalPax / totalCapacity) * 100) 
        : 0;

      return {
        summary: {
          totalSessions,
          totalPax,
          totalRevenue,
          avgOccupancy,
        },
        activityStats,
      };
    },
    enabled: !!currentResort,
  });

  const chartData = useMemo(() => {
    return reportData?.activityStats.map(stat => ({
      name: stat.name.length > 15 ? stat.name.substring(0, 15) + '...' : stat.name,
      pax: stat.confirmedPax,
      revenue: stat.totalRevenue,
    })) || [];
  }, [reportData]);

  const exportCSV = () => {
    if (!reportData) return;

    const headers = ['Activity', 'Total Sessions', 'Total Pax', 'Avg Occupancy %', 'Total Revenue', 'No-Show %'];
    const rows = reportData.activityStats.map(stat => [
      stat.name,
      stat.totalSessions,
      stat.confirmedPax,
      stat.avgOccupancy,
      stat.totalRevenue.toFixed(2),
      stat.noShowPercent,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activities-report-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  if (!currentResort) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select a resort to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activities Report</h1>
          <p className="text-muted-foreground">Activity booking statistics and revenue</p>
        </div>
        <Button onClick={exportCSV} disabled={!reportData}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Activity</Label>
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  {activities?.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{reportData?.summary.totalSessions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pax</p>
                <p className="text-2xl font-bold">{reportData?.summary.totalPax || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {currentResort?.currency} {(reportData?.summary.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Occupancy</p>
                <p className="text-2xl font-bold">{reportData?.summary.avgOccupancy || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pax by Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="pax" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Total Pax</TableHead>
                  <TableHead className="text-right">Avg Occupancy</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">No-Show %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.activityStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No data for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.activityStats.map((stat, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{stat.name}</TableCell>
                      <TableCell className="text-right">{stat.totalSessions}</TableCell>
                      <TableCell className="text-right">{stat.confirmedPax}</TableCell>
                      <TableCell className="text-right">{stat.avgOccupancy}%</TableCell>
                      <TableCell className="text-right">
                        {currentResort?.currency} {stat.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{stat.noShowPercent}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
