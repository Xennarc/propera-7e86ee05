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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Download, Users, TrendingDown, Utensils, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { DateRangePresets } from '@/components/reports/DateRangePresets';
import { ReportStatCard } from '@/components/reports/ReportStatCard';
import { TrendChart } from '@/components/reports/TrendChart';
import { DayOfWeekChart } from '@/components/reports/DayOfWeekChart';
import { TierGate } from '@/components/tier/TierGate';

const MEAL_PERIOD_COLORS: Record<string, string> = {
  BREAKFAST: 'hsl(var(--chart-1))',
  LUNCH: 'hsl(var(--chart-2))',
  DINNER: 'hsl(var(--chart-3))',
  EVENT: 'hsl(var(--chart-4))',
};

export default function RestaurantsReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');

  // Fetch restaurants for filter
  const { data: restaurants } = useQuery({
    queryKey: ['restaurants', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('restaurants')
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
    queryKey: ['restaurants-report', currentResort?.id, startDate, endDate, selectedRestaurant],
    queryFn: async () => {
      if (!currentResort) return null;

      // Fetch slots with reservations
      let slotsQuery = supabase
        .from('restaurant_time_slots')
        .select(`
          id,
          date,
          capacity,
          meal_period,
          restaurant_id,
          restaurants!inner(id, name),
          restaurant_reservations(
            id,
            status,
            num_adults,
            num_children
          )
        `)
        .eq('resort_id', currentResort.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (selectedRestaurant !== 'all') {
        slotsQuery = slotsQuery.eq('restaurant_id', selectedRestaurant);
      }

      const { data: slots, error } = await slotsQuery;
      if (error) throw error;

      // Aggregate data by restaurant and meal period
      const statsMap = new Map<string, {
        restaurantName: string;
        mealPeriod: string;
        slotsCount: number;
        totalCovers: number;
        noShowCount: number;
        confirmedAndNoShowCount: number;
      }>();

      let totalCovers = 0;
      let totalSlots = 0;
      let totalNoShows = 0;
      let totalConfirmedAndNoShows = 0;

      // Meal period breakdown
      const mealPeriodMap = new Map<string, number>();
      
      // Daily trend data
      const dailyMap = new Map<string, number>();
      
      // Day of week data
      const dowCovers = [0, 0, 0, 0, 0, 0, 0];

      slots?.forEach((slot: any) => {
        const key = `${slot.restaurant_id}-${slot.meal_period}`;
        const restaurantName = slot.restaurants?.name || 'Unknown';

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            restaurantName,
            mealPeriod: slot.meal_period,
            slotsCount: 0,
            totalCovers: 0,
            noShowCount: 0,
            confirmedAndNoShowCount: 0,
          });
        }

        const stats = statsMap.get(key)!;
        stats.slotsCount += 1;
        totalSlots += 1;

        slot.restaurant_reservations?.forEach((res: any) => {
          const covers = (res.num_adults || 0) + (res.num_children || 0);
          
          if (res.status === 'CONFIRMED' || res.status === 'COMPLETED') {
            stats.totalCovers += covers;
            stats.confirmedAndNoShowCount += 1;
            totalCovers += covers;
            totalConfirmedAndNoShows += 1;
            
            // Track meal period
            mealPeriodMap.set(slot.meal_period, (mealPeriodMap.get(slot.meal_period) || 0) + covers);
            
            // Track daily trend
            const dateKey = slot.date;
            dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + covers);
            
            // Track day of week
            const dayOfWeek = new Date(slot.date).getDay();
            dowCovers[dayOfWeek] += covers;
          } else if (res.status === 'NO_SHOW') {
            stats.noShowCount += 1;
            stats.confirmedAndNoShowCount += 1;
            totalNoShows += 1;
            totalConfirmedAndNoShows += 1;
          }
        });
      });

      const tableStats = Array.from(statsMap.values()).map(stats => ({
        ...stats,
        avgCoversPerSlot: stats.slotsCount > 0 
          ? Math.round(stats.totalCovers / stats.slotsCount * 10) / 10 
          : 0,
        noShowPercent: stats.confirmedAndNoShowCount > 0
          ? Math.round((stats.noShowCount / stats.confirmedAndNoShowCount) * 100)
          : 0,
      }));

      // Sort by restaurant name, then meal period
      tableStats.sort((a, b) => {
        if (a.restaurantName !== b.restaurantName) {
          return a.restaurantName.localeCompare(b.restaurantName);
        }
        const mealOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'EVENT'];
        return mealOrder.indexOf(a.mealPeriod) - mealOrder.indexOf(b.mealPeriod);
      });

      const avgCoversPerSlot = totalSlots > 0 
        ? Math.round(totalCovers / totalSlots * 10) / 10 
        : 0;
      const noShowPercent = totalConfirmedAndNoShows > 0
        ? Math.round((totalNoShows / totalConfirmedAndNoShows) * 100)
        : 0;

      // Prepare chart data (restaurant by covers per meal period)
      const chartDataMap = new Map<string, Record<string, string | number>>();
      tableStats.forEach(stat => {
        if (!chartDataMap.has(stat.restaurantName)) {
          chartDataMap.set(stat.restaurantName, { name: stat.restaurantName });
        }
        chartDataMap.get(stat.restaurantName)![stat.mealPeriod] = stat.totalCovers;
      });

      // Meal period pie data
      const mealPeriodData = Array.from(mealPeriodMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));
      
      // Daily trend for chart
      const dailyTrend = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({
          date: format(new Date(date), 'MMM d'),
          value,
        }));

      return {
        summary: {
          totalCovers,
          avgCoversPerSlot,
          noShowPercent,
          totalSlots,
        },
        tableStats,
        chartData: Array.from(chartDataMap.values()),
        mealPeriodData,
        dailyTrend,
        dayOfWeekCovers: dowCovers,
      };
    },
    enabled: !!currentResort,
  });

  const exportCSV = () => {
    if (!reportData) return;

    const headers = ['Restaurant', 'Meal Period', 'Slots', 'Total Covers', 'Avg Covers/Slot', 'No-Show %'];
    const rows = reportData.tableStats.map(stat => [
      stat.restaurantName,
      stat.mealPeriod,
      stat.slotsCount,
      stat.totalCovers,
      stat.avgCoversPerSlot,
      stat.noShowPercent,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `restaurants-report-${startDate}-to-${endDate}.csv`;
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
          <h1 className="text-3xl font-bold text-foreground">Restaurants Report</h1>
          <p className="text-muted-foreground">Restaurant reservation statistics by meal period</p>
        </div>
        <Button onClick={exportCSV} disabled={!reportData} variant="outline">
          <Download className="mr-2 h-4 w-4" />
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
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Restaurants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Restaurants</SelectItem>
                    {restaurants?.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportStatCard
          title="Total Covers"
          value={reportData?.summary.totalCovers || 0}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Avg Covers/Slot"
          value={reportData?.summary.avgCoversPerSlot || 0}
          icon={<Utensils className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Total Slots"
          value={reportData?.summary.totalSlots || 0}
          icon={<Clock className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="No-Show Rate"
          value={`${reportData?.summary.noShowPercent || 0}%`}
          icon={<TrendingDown className="h-5 w-5 text-destructive" />}
          variant={reportData?.summary.noShowPercent && reportData.summary.noShowPercent > 10 ? 'danger' : 'default'}
        />
      </div>

      {/* Elite: Trend Analysis */}
      <TierGate feature="reports_trend_analysis" fallback="hide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrendChart
            title="Daily Covers Trend"
            description="Covers over the selected period"
            data={reportData?.dailyTrend || []}
            valueLabel="Covers"
            valueFormatter={(v) => `${v} covers`}
            color="success"
          />
          <DayOfWeekChart
            title="Covers by Day of Week"
            description="Identify peak dining days"
            data={reportData?.dayOfWeekCovers || [0, 0, 0, 0, 0, 0, 0]}
            valueLabel="Covers"
            valueFormatter={(v) => `${v} covers`}
            highlightPeak
          />
        </div>
      </TierGate>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportData?.chartData && reportData.chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Covers by Restaurant & Meal Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.chartData}>
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
                    <Legend />
                    <Bar dataKey="BREAKFAST" stackId="a" fill={MEAL_PERIOD_COLORS.BREAKFAST} name="Breakfast" />
                    <Bar dataKey="LUNCH" stackId="a" fill={MEAL_PERIOD_COLORS.LUNCH} name="Lunch" />
                    <Bar dataKey="DINNER" stackId="a" fill={MEAL_PERIOD_COLORS.DINNER} name="Dinner" />
                    <Bar dataKey="EVENT" stackId="a" fill={MEAL_PERIOD_COLORS.EVENT} name="Event" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {reportData?.mealPeriodData && reportData.mealPeriodData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Covers by Meal Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.mealPeriodData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {reportData.mealPeriodData.map((entry) => (
                        <Cell key={entry.name} fill={MEAL_PERIOD_COLORS[entry.name] || 'hsl(var(--chart-5))'} />
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown by Restaurant & Meal Period</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Meal Period</TableHead>
                  <TableHead className="text-right">Slots</TableHead>
                  <TableHead className="text-right">Total Covers</TableHead>
                  <TableHead className="text-right">Avg Covers/Slot</TableHead>
                  <TableHead className="text-right">No-Show %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.tableStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No data for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.tableStats.map((stat, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{stat.restaurantName}</TableCell>
                      <TableCell>{stat.mealPeriod}</TableCell>
                      <TableCell className="text-right">{stat.slotsCount}</TableCell>
                      <TableCell className="text-right">{stat.totalCovers}</TableCell>
                      <TableCell className="text-right">{stat.avgCoversPerSlot}</TableCell>
                      <TableCell className="text-right">{stat.noShowPercent}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AIInsightsPanel
        reportType="restaurants"
        reportData={reportData || {}}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
