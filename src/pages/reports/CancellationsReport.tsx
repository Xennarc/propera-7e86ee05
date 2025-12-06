import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingDown, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { DateRangePresets } from '@/components/reports/DateRangePresets';
import { ReportStatCard } from '@/components/reports/ReportStatCard';
import { format, subDays } from 'date-fns';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function CancellationsReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [moduleFilter, setModuleFilter] = useState<'all' | 'activities' | 'restaurants'>('all');

  // Fetch activity cancellations
  const { data: activityCancellations = [] } = useQuery({
    queryKey: ['activity-cancellations', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return [];
      
      const { data, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          num_adults,
          num_children,
          session_id,
          activity_sessions!inner (
            date,
            start_time,
            activity_id,
            activities!inner (
              name,
              category
            )
          )
        `)
        .eq('resort_id', currentResort.id)
        .eq('status', 'CANCELLED')
        .gte('activity_sessions.date', startDate)
        .lte('activity_sessions.date', endDate)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort && (moduleFilter === 'all' || moduleFilter === 'activities'),
  });

  // Fetch restaurant cancellations
  const { data: restaurantCancellations = [] } = useQuery({
    queryKey: ['restaurant-cancellations', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return [];
      
      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          num_adults,
          num_children,
          restaurant_slot_id,
          restaurant_time_slots!inner (
            date,
            start_time,
            restaurant_id,
            restaurants!inner (
              name
            )
          )
        `)
        .eq('resort_id', currentResort.id)
        .eq('status', 'CANCELLED')
        .gte('restaurant_time_slots.date', startDate)
        .lte('restaurant_time_slots.date', endDate)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort && (moduleFilter === 'all' || moduleFilter === 'restaurants'),
  });

  const reportData = useMemo(() => {
    const totalActivityCancellations = activityCancellations.length;
    const totalRestaurantCancellations = restaurantCancellations.length;
    const totalCancellations = totalActivityCancellations + totalRestaurantCancellations;

    // Calculate lead times
    const calculateLeadTime = (createdAt: string, updatedAt: string) => {
      const created = new Date(createdAt);
      const cancelled = new Date(updatedAt);
      return Math.floor((cancelled.getTime() - created.getTime()) / (1000 * 60 * 60)); // hours
    };

    const activityLeadTimes = activityCancellations.map(c => calculateLeadTime(c.created_at, c.updated_at));
    const restaurantLeadTimes = restaurantCancellations.map(c => calculateLeadTime(c.created_at, c.updated_at));
    const allLeadTimes = [...activityLeadTimes, ...restaurantLeadTimes];

    const avgLeadTime = allLeadTimes.length > 0 
      ? allLeadTimes.reduce((sum, lt) => sum + lt, 0) / allLeadTimes.length 
      : 0;

    const lastMinuteCancellations = allLeadTimes.filter(lt => lt < 24).length;

    // Breakdown by module
    const moduleBreakdown = [
      { name: 'Activities', value: totalActivityCancellations, percentage: totalCancellations > 0 ? (totalActivityCancellations / totalCancellations * 100).toFixed(1) : 0 },
      { name: 'Restaurants', value: totalRestaurantCancellations, percentage: totalCancellations > 0 ? (totalRestaurantCancellations / totalCancellations * 100).toFixed(1) : 0 },
    ];

    // Lead time buckets
    const leadTimeBuckets = [
      { name: '>48h', value: allLeadTimes.filter(lt => lt >= 48).length },
      { name: '24-48h', value: allLeadTimes.filter(lt => lt >= 24 && lt < 48).length },
      { name: '<24h', value: allLeadTimes.filter(lt => lt < 24).length },
    ];

    return {
      totalCancellations,
      totalActivityCancellations,
      totalRestaurantCancellations,
      avgLeadTime: avgLeadTime.toFixed(1),
      lastMinuteCancellations,
      moduleBreakdown,
      leadTimeBuckets,
    };
  }, [activityCancellations, restaurantCancellations]);

  const exportCSV = () => {
    const headers = ['Type', 'Name', 'Date', 'Created', 'Cancelled', 'Lead Time (hrs)', 'Pax'];
    const rows: string[][] = [];

    activityCancellations.forEach((c: any) => {
      const activity = c.activity_sessions.activities;
      const leadTime = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60));
      rows.push([
        'Activity',
        activity.name,
        c.activity_sessions.date,
        format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
        format(new Date(c.updated_at), 'yyyy-MM-dd HH:mm'),
        leadTime.toString(),
        (c.num_adults + c.num_children).toString(),
      ]);
    });

    restaurantCancellations.forEach((c: any) => {
      const restaurant = c.restaurant_time_slots.restaurants;
      const leadTime = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60));
      rows.push([
        'Restaurant',
        restaurant.name,
        c.restaurant_time_slots.date,
        format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
        format(new Date(c.updated_at), 'yyyy-MM-dd HH:mm'),
        leadTime.toString(),
        (c.num_adults + c.num_children).toString(),
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancellations-report-${startDate}-to-${endDate}.csv`;
    a.click();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cancellations Report</h1>
          <p className="text-muted-foreground">Cross-module cancellation analysis</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Presets & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <DateRangePresets
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <div className="flex items-center gap-4">
              <div className="w-[200px]">
                <Select value={moduleFilter} onValueChange={(v: any) => setModuleFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="activities">Activities Only</SelectItem>
                    <SelectItem value="restaurants">Restaurants Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <ReportStatCard
          title="Total Cancellations"
          value={reportData.totalCancellations}
          icon={<XCircle className="h-5 w-5 text-destructive" />}
          variant="danger"
        />
        <ReportStatCard
          title="Avg Lead Time"
          value={`${reportData.avgLeadTime}h`}
          subtitle="Time before cancellation"
          icon={<Clock className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Last-Minute (<24h)"
          value={reportData.lastMinuteCancellations}
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          variant="warning"
        />
        <ReportStatCard
          title="Activities vs Restaurants"
          value={`${reportData.totalActivityCancellations} / ${reportData.totalRestaurantCancellations}`}
          icon={<TrendingDown className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cancellations by Module</CardTitle>
            <CardDescription>Activity vs Restaurant breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.moduleBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                >
                  {reportData.moduleBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Time Distribution</CardTitle>
            <CardDescription>Time between booking and cancellation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.leadTimeBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <AIInsightsPanel
        reportType="cancellations"
        reportData={reportData}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
