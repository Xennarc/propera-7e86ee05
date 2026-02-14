import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingDown, Clock, AlertTriangle, XCircle, DollarSign, Calendar } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { DateRangePresets } from '@/components/reports/DateRangePresets';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { TrendChart } from '@/components/reports/TrendChart';
import { DayOfWeekChart } from '@/components/reports/DayOfWeekChart';
import { TierGate } from '@/components/tier/TierGate';
import { FeatureVisible } from '@/components/FeatureGate';
import { format, subDays, parseISO, getDay, differenceInHours } from 'date-fns';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function CancellationsReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [moduleFilter, setModuleFilter] = useState<'all' | 'activities' | 'restaurants'>('all');

  // Fetch activity cancellations
  const { data: activityCancellations = [] } = useQuery({
    queryKey: ['activity-cancellations-enhanced', currentResort?.id, startDate, endDate],
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
          total_amount,
          booking_source,
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
    queryKey: ['restaurant-cancellations-enhanced', currentResort?.id, startDate, endDate],
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
          total_amount,
          booking_source,
          restaurant_slot_id,
          restaurant_time_slots!inner (
            date,
            start_time,
            meal_period,
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

    // Calculate revenue lost
    const activityRevenueLost = activityCancellations.reduce((sum, c: any) => sum + (c.total_amount || 0), 0);
    const restaurantRevenueLost = restaurantCancellations.reduce((sum, c: any) => sum + (c.total_amount || 0), 0);
    const totalRevenueLost = activityRevenueLost + restaurantRevenueLost;

    // Calculate lead times (time from booking to cancellation in hours)
    const calculateLeadTime = (createdAt: string, updatedAt: string) => {
      return differenceInHours(parseISO(updatedAt), parseISO(createdAt));
    };

    const activityLeadTimes = activityCancellations.map((c: any) => calculateLeadTime(c.created_at, c.updated_at));
    const restaurantLeadTimes = restaurantCancellations.map((c: any) => calculateLeadTime(c.created_at, c.updated_at));
    const allLeadTimes = [...activityLeadTimes, ...restaurantLeadTimes];

    const avgLeadTime = allLeadTimes.length > 0 
      ? allLeadTimes.reduce((sum, lt) => sum + lt, 0) / allLeadTimes.length 
      : 0;

    const lastMinuteCancellations = allLeadTimes.filter(lt => lt < 24).length;

    // Day of week analysis
    const cancellationsByDayOfWeek: number[] = [0, 0, 0, 0, 0, 0, 0];
    
    activityCancellations.forEach((c: any) => {
      const day = getDay(parseISO(c.activity_sessions.date));
      cancellationsByDayOfWeek[day]++;
    });
    
    restaurantCancellations.forEach((c: any) => {
      const day = getDay(parseISO(c.restaurant_time_slots.date));
      cancellationsByDayOfWeek[day]++;
    });

    // Daily trend
    const dailyCancellations: Record<string, number> = {};
    
    activityCancellations.forEach((c: any) => {
      const date = c.activity_sessions.date;
      dailyCancellations[date] = (dailyCancellations[date] || 0) + 1;
    });
    
    restaurantCancellations.forEach((c: any) => {
      const date = c.restaurant_time_slots.date;
      dailyCancellations[date] = (dailyCancellations[date] || 0) + 1;
    });

    const dailyTrendData = Object.entries(dailyCancellations)
      .map(([date, value]) => ({ date: format(parseISO(date), 'MMM dd'), value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Activity category breakdown
    const categoryBreakdown: Record<string, { count: number; revenueLost: number }> = {};
    activityCancellations.forEach((c: any) => {
      const category = c.activity_sessions.activities.category;
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, revenueLost: 0 };
      }
      categoryBreakdown[category].count++;
      categoryBreakdown[category].revenueLost += c.total_amount || 0;
    });

    const categoryData = Object.entries(categoryBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Meal period breakdown for restaurants
    const mealPeriodBreakdown: Record<string, number> = {};
    restaurantCancellations.forEach((c: any) => {
      const period = c.restaurant_time_slots.meal_period;
      mealPeriodBreakdown[period] = (mealPeriodBreakdown[period] || 0) + 1;
    });

    const mealPeriodData = Object.entries(mealPeriodBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Booking source analysis
    const sourceBreakdown: Record<string, number> = {};
    [...activityCancellations, ...restaurantCancellations].forEach((c: any) => {
      const source = c.booking_source || 'NORMAL';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });

    const sourceData = Object.entries(sourceBreakdown)
      .map(([name, value]) => ({ 
        name: name === 'PRE_STAY' ? 'Pre-arrival' : name === 'IN_STAY_SUGGESTION' ? 'In-stay Upsell' : 'Normal',
        value 
      }));

    // Top cancelled activities
    const activityCancelMap: Record<string, { name: string; count: number; revenueLost: number }> = {};
    activityCancellations.forEach((c: any) => {
      const id = c.activity_sessions.activity_id;
      const name = c.activity_sessions.activities.name;
      if (!activityCancelMap[id]) {
        activityCancelMap[id] = { name, count: 0, revenueLost: 0 };
      }
      activityCancelMap[id].count++;
      activityCancelMap[id].revenueLost += c.total_amount || 0;
    });

    const topCancelledActivities = Object.values(activityCancelMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Breakdown by module
    const moduleBreakdown = [
      { name: 'Activities', value: totalActivityCancellations, revenueLost: activityRevenueLost },
      { name: 'Restaurants', value: totalRestaurantCancellations, revenueLost: restaurantRevenueLost },
    ];

    // Lead time buckets
    const leadTimeBuckets = [
      { name: '>48h', value: allLeadTimes.filter(lt => lt >= 48).length },
      { name: '24-48h', value: allLeadTimes.filter(lt => lt >= 24 && lt < 48).length },
      { name: '<24h', value: allLeadTimes.filter(lt => lt < 24).length },
    ];

    // Pax lost
    const totalPaxLost = [...activityCancellations, ...restaurantCancellations]
      .reduce((sum, c: any) => sum + (c.num_adults || 0) + (c.num_children || 0), 0);

    return {
      totalCancellations,
      totalActivityCancellations,
      totalRestaurantCancellations,
      totalRevenueLost,
      activityRevenueLost,
      restaurantRevenueLost,
      avgLeadTime: avgLeadTime.toFixed(1),
      lastMinuteCancellations,
      moduleBreakdown,
      leadTimeBuckets,
      cancellationsByDayOfWeek,
      dailyTrendData,
      categoryData,
      mealPeriodData,
      sourceData,
      topCancelledActivities,
      totalPaxLost,
    };
  }, [activityCancellations, restaurantCancellations]);

  const exportCSV = () => {
    const headers = ['Type', 'Name', 'Category/Period', 'Date', 'Created', 'Cancelled', 'Lead Time (hrs)', 'Pax', 'Revenue Lost', 'Booking Source'];
    const rows: string[][] = [];

    activityCancellations.forEach((c: any) => {
      const activity = c.activity_sessions?.activities;
      if (!activity) return; // Skip orphaned records
      const leadTime = differenceInHours(parseISO(c.updated_at), parseISO(c.created_at));
      rows.push([
        'Activity',
        activity.name || 'Unknown',
        activity.category || 'N/A',
        c.activity_sessions?.date || '',
        format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
        format(new Date(c.updated_at), 'yyyy-MM-dd HH:mm'),
        leadTime.toString(),
        (c.num_adults + c.num_children).toString(),
        (c.total_amount || 0).toFixed(2),
        c.booking_source || 'NORMAL',
      ]);
    });

    restaurantCancellations.forEach((c: any) => {
      const restaurant = c.restaurant_time_slots?.restaurants;
      if (!restaurant) return; // Skip orphaned records
      const leadTime = differenceInHours(parseISO(c.updated_at), parseISO(c.created_at));
      rows.push([
        'Restaurant',
        restaurant.name || 'Unknown',
        c.restaurant_time_slots?.meal_period || 'N/A',
        c.restaurant_time_slots?.date || '',
        format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
        format(new Date(c.updated_at), 'yyyy-MM-dd HH:mm'),
        leadTime.toString(),
        (c.num_adults + c.num_children).toString(),
        (c.total_amount || 0).toFixed(2),
        c.booking_source || 'NORMAL',
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
          <p className="text-muted-foreground">Cross-module cancellation analysis and patterns</p>
        </div>
        <FeatureVisible flag="enable_reports_exports">
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </FeatureVisible>
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
      <KpiGrid columns="grid-cols-1 xs:grid-cols-2 md:grid-cols-4" maxWidth="full">
        <KpiCard
          label="Total Cancellations"
          value={reportData.totalCancellations}
          helperText={`${reportData.totalPaxLost} pax lost`}
          icon={XCircle}
          variant="destructive"
        />
        <KpiCard
          label="Revenue Lost"
          value={`${currentResort.currency} ${reportData.totalRevenueLost.toLocaleString()}`}
          icon={DollarSign}
          variant="destructive"
        />
        <KpiCard
          label="Avg Lead Time"
          value={`${reportData.avgLeadTime}h`}
          helperText="Booking to cancellation"
          icon={Clock}
        />
        <KpiCard
          label="Last-Minute (<24h)"
          value={reportData.lastMinuteCancellations}
          helperText={`${reportData.totalCancellations > 0 ? ((reportData.lastMinuteCancellations / reportData.totalCancellations) * 100).toFixed(0) : 0}% of total`}
          icon={AlertTriangle}
          variant="warning"
        />
      </KpiGrid>

      {/* Elite-tier Advanced Analytics */}
      <TierGate feature="reports_sales_performance" fallback="hide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day of Week Pattern */}
          <DayOfWeekChart
            title="Cancellations by Day"
            description="Which days have most cancellations"
            data={reportData.cancellationsByDayOfWeek}
            valueLabel="Cancellations"
          />

          {/* Booking Source Analysis */}
          {reportData.sourceData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By Booking Source</CardTitle>
                <CardDescription>Where cancellations originate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={reportData.sourceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {reportData.sourceData.map((_, index) => (
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
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cancellation Trend */}
        {reportData.dailyTrendData.length > 0 && (
          <TrendChart
            title="Daily Cancellation Trend"
            description="Cancellations over time"
            data={reportData.dailyTrendData}
            valueLabel="Cancellations"
            color="danger"
          />
        )}

        {/* Top Cancelled Activities */}
        {reportData.topCancelledActivities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-destructive" />
                Most Cancelled Activities
              </CardTitle>
              <CardDescription>Activities with highest cancellation counts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Activity</th>
                      <th className="pb-2 font-medium text-right">Cancellations</th>
                      <th className="pb-2 font-medium text-right">Revenue Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topCancelledActivities.map((activity, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 font-medium">{activity.name}</td>
                        <td className="py-3 text-right text-destructive font-medium">{activity.count}</td>
                        <td className="py-3 text-right">{currentResort.currency} {activity.revenueLost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </TierGate>

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
                  label={(entry) => `${entry.name}: ${entry.value}`}
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
                  formatter={(value: number, name: string, props: any) => [
                    `${value} (${currentResort.currency} ${props.payload.revenueLost.toFixed(2)} lost)`,
                    name
                  ]}
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

      {/* Category & Meal Period Breakdown */}
      {(reportData.categoryData.length > 0 || reportData.mealPeriodData.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {reportData.categoryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Cancellations by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportData.categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        name === 'count' ? value : `${currentResort.currency} ${value.toFixed(2)}`,
                        name === 'count' ? 'Cancellations' : 'Revenue Lost'
                      ]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Cancellations" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {reportData.mealPeriodData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Cancellations by Meal Period</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportData.mealPeriodData}>
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
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Cancellations" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AIInsightsPanel
        reportType="cancellations"
        reportData={reportData}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
