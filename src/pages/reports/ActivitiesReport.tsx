import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Calendar, Users, DollarSign, TrendingUp, Activity, Percent } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { DateRangePresets } from '@/components/reports/DateRangePresets';
import { ReportStatCard } from '@/components/reports/ReportStatCard';
import { EmptyState } from '@/components/ui/empty-state';
import { TrendChart } from '@/components/reports/TrendChart';
import { DayOfWeekChart } from '@/components/reports/DayOfWeekChart';
import { TierGate } from '@/components/tier/TierGate';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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
        .select('id, name, category')
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
          activities!inner(id, name, category),
          activity_bookings(
            id,
            status,
            num_adults,
            num_children,
            total_amount,
            booking_source
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
        category: string;
        totalSessions: number;
        totalCapacity: number;
        confirmedPax: number;
        totalRevenue: number;
        noShowCount: number;
        confirmedAndNoShowCount: number;
        preStayRevenue: number;
        inStayRevenue: number;
      }>();

      const categoryMap = new Map<string, number>();

      let totalSessions = 0;
      let totalPax = 0;
      let totalRevenue = 0;
      let totalCapacity = 0;
      let totalNoShows = 0;
      let totalBookings = 0;
      let preStayRevenue = 0;
      let inStayRevenue = 0;
      
      // Daily trend data
      const dailyMap = new Map<string, { pax: number; revenue: number }>();
      
      // Day of week data
      const dowPax = [0, 0, 0, 0, 0, 0, 0];

      sessions?.forEach((session: any) => {
        const activityName = session.activities?.name || 'Unknown';
        const activityCategory = session.activities?.category || 'OTHER';
        const activityId = session.activity_id;

        if (!activityMap.has(activityId)) {
          activityMap.set(activityId, {
            name: activityName,
            category: activityCategory,
            totalSessions: 0,
            totalCapacity: 0,
            confirmedPax: 0,
            totalRevenue: 0,
            noShowCount: 0,
            confirmedAndNoShowCount: 0,
            preStayRevenue: 0,
            inStayRevenue: 0,
          });
        }

        const stats = activityMap.get(activityId)!;
        stats.totalSessions += 1;
        stats.totalCapacity += session.capacity;
        totalSessions += 1;
        totalCapacity += session.capacity;

        session.activity_bookings?.forEach((booking: any) => {
          const pax = (booking.num_adults || 0) + (booking.num_children || 0);
          const revenue = booking.total_amount || 0;
          
          if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
            stats.confirmedPax += pax;
            stats.totalRevenue += revenue;
            stats.confirmedAndNoShowCount += 1;
            totalPax += pax;
            totalRevenue += revenue;
            totalBookings += 1;

            // Track by category
            categoryMap.set(activityCategory, (categoryMap.get(activityCategory) || 0) + pax);

            // Track daily trend
            const dateKey = session.date;
            if (!dailyMap.has(dateKey)) {
              dailyMap.set(dateKey, { pax: 0, revenue: 0 });
            }
            const dayData = dailyMap.get(dateKey)!;
            dayData.pax += pax;
            dayData.revenue += revenue;
            
            // Track day of week
            const dayOfWeek = new Date(session.date).getDay();
            dowPax[dayOfWeek] += pax;

            // Track booking source
            if (booking.booking_source === 'PRE_STAY') {
              stats.preStayRevenue += revenue;
              preStayRevenue += revenue;
            } else if (booking.booking_source === 'IN_STAY_SUGGESTION') {
              stats.inStayRevenue += revenue;
              inStayRevenue += revenue;
            }
          } else if (booking.status === 'NO_SHOW') {
            stats.noShowCount += 1;
            stats.confirmedAndNoShowCount += 1;
            totalNoShows += 1;
            totalBookings += 1;
          }
        });
      });

      const activityStats = Array.from(activityMap.values())
        .map(stats => ({
          ...stats,
          avgOccupancy: stats.totalCapacity > 0 
            ? Math.round((stats.confirmedPax / stats.totalCapacity) * 100) 
            : 0,
          noShowPercent: stats.confirmedAndNoShowCount > 0
            ? Math.round((stats.noShowCount / stats.confirmedAndNoShowCount) * 100)
            : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const avgOccupancy = totalCapacity > 0 
        ? Math.round((totalPax / totalCapacity) * 100) 
        : 0;

      const noShowRate = totalBookings > 0
        ? Math.round((totalNoShows / totalBookings) * 100)
        : 0;

      const categoryData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      // Daily trend for chart
      const dailyTrend = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          date: format(new Date(date), 'MMM d'),
          value: data.pax,
        }));

      return {
        summary: {
          totalSessions,
          totalPax,
          totalRevenue,
          avgOccupancy,
          noShowRate,
          preStayRevenue,
          inStayRevenue,
          totalBookings,
        },
        activityStats,
        categoryData,
        dailyTrend,
        dayOfWeekPax: dowPax,
      };
    },
    enabled: !!currentResort,
  });

  const chartData = useMemo(() => {
    return reportData?.activityStats.slice(0, 10).map(stat => ({
      name: stat.name.length > 20 ? stat.name.substring(0, 20) + '...' : stat.name,
      pax: stat.confirmedPax,
      revenue: stat.totalRevenue,
      occupancy: stat.avgOccupancy,
    })) || [];
  }, [reportData]);

  const exportCSV = () => {
    if (!reportData) return;

    const headers = ['Activity', 'Category', 'Sessions', 'Total Pax', 'Avg Occupancy %', 'Total Revenue', 'No-Show %', 'Pre-Stay Revenue', 'In-Stay Revenue'];
    const rows = reportData.activityStats.map(stat => [
      stat.name,
      stat.category,
      stat.totalSessions,
      stat.confirmedPax,
      stat.avgOccupancy,
      stat.totalRevenue.toFixed(2),
      stat.noShowPercent,
      stat.preStayRevenue.toFixed(2),
      stat.inStayRevenue.toFixed(2),
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
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Activity}
          title="No Resort Selected"
          description="Please select a resort to view activity reports"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activities Report</h1>
          <p className="text-muted-foreground">Activity booking statistics and revenue analysis</p>
        </div>
        <Button onClick={exportCSV} disabled={!reportData || isLoading} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
            <DateRangePresets
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Activity</label>
              <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                <SelectTrigger className="h-9">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportStatCard
          title="Total Sessions"
          value={reportData?.summary.totalSessions || 0}
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Total Guests"
          value={reportData?.summary.totalPax || 0}
          subtitle={`${reportData?.summary.totalBookings || 0} bookings`}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Total Revenue"
          value={`${currentResort.currency} ${(reportData?.summary.totalRevenue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Avg Occupancy"
          value={`${reportData?.summary.avgOccupancy || 0}%`}
          subtitle={`${reportData?.summary.noShowRate || 0}% no-show rate`}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          variant={
            (reportData?.summary.avgOccupancy || 0) >= 70 
              ? 'success' 
              : (reportData?.summary.avgOccupancy || 0) >= 40 
                ? 'default' 
                : 'warning'
          }
        />
      </div>

      {/* Elite: Trend Analysis */}
      <TierGate feature="reports_trend_analysis" fallback="hide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrendChart
            title="Daily Guest Trend"
            description="Activity participants over the period"
            data={reportData?.dailyTrend || []}
            valueLabel="Guests"
            valueFormatter={(v) => `${v} guests`}
            color="primary"
          />
          <DayOfWeekChart
            title="Guests by Day of Week"
            description="Identify peak activity days"
            data={reportData?.dayOfWeekPax || [0, 0, 0, 0, 0, 0, 0]}
            valueLabel="Guests"
            valueFormatter={(v) => `${v} guests`}
            highlightPeak
          />
        </div>
      </TierGate>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Guests by Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={120} className="text-xs" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'pax' ? `${value} guests` : `${currentResort.currency} ${value.toLocaleString()}`,
                        name === 'pax' ? 'Guests' : 'Revenue'
                      ]}
                    />
                    <Bar dataKey="pax" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No data for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.categoryData && reportData.categoryData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {reportData.categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value} guests`, 'Guests']}
                    />
                    <Legend 
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No category data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Source Breakdown */}
      {(reportData?.summary.preStayRevenue || 0) > 0 || (reportData?.summary.inStayRevenue || 0) > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportStatCard
            title="Pre-Stay Bookings"
            value={`${currentResort.currency} ${(reportData?.summary.preStayRevenue || 0).toLocaleString()}`}
            subtitle="Booked before arrival"
            icon={<Calendar className="h-5 w-5 text-blue-500" />}
          />
          <ReportStatCard
            title="In-Stay Upsells"
            value={`${currentResort.currency} ${(reportData?.summary.inStayRevenue || 0).toLocaleString()}`}
            subtitle="From suggestions"
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          />
        </div>
      ) : null}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">Occupancy</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">No-Show</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.activityStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No data for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData?.activityStats.map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium max-w-[200px] truncate">{stat.name}</TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{stat.category}</span>
                        </TableCell>
                        <TableCell className="text-right">{stat.totalSessions}</TableCell>
                        <TableCell className="text-right">{stat.confirmedPax}</TableCell>
                        <TableCell className="text-right">
                          <span className={
                            stat.avgOccupancy >= 70 
                              ? 'text-green-600 dark:text-green-400' 
                              : stat.avgOccupancy >= 40 
                                ? '' 
                                : 'text-amber-600 dark:text-amber-400'
                          }>
                            {stat.avgOccupancy}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {currentResort.currency} {stat.totalRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={stat.noShowPercent > 10 ? 'text-red-600 dark:text-red-400' : ''}>
                            {stat.noShowPercent}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <AIInsightsPanel
        reportType="activities"
        reportData={reportData || {}}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
