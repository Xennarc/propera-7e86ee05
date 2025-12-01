import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, Globe } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
];

type SegmentType = 'activities' | 'restaurants';

export default function MarketReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [segmentType, setSegmentType] = useState<SegmentType>('activities');

  // Fetch activities report data
  const { data: activitiesData, isLoading: loadingActivities } = useQuery({
    queryKey: ['market-report-activities', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return null;

      const { data: bookings, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          num_adults,
          num_children,
          total_amount,
          guest_id,
          session_id,
          activity_sessions!inner(date),
          guests!inner(id, nationality)
        `)
        .eq('resort_id', currentResort.id)
        .in('status', ['CONFIRMED', 'COMPLETED'])
        .gte('activity_sessions.date', startDate)
        .lte('activity_sessions.date', endDate);

      if (error) throw error;

      // Aggregate by nationality
      const nationalityMap = new Map<string, {
        nationality: string;
        totalPax: number;
        totalRevenue: number;
        uniqueGuests: Set<string>;
      }>();

      bookings?.forEach((booking: any) => {
        const nationality = booking.guests?.nationality || 'Unknown';
        const pax = (booking.num_adults || 0) + (booking.num_children || 0);

        if (!nationalityMap.has(nationality)) {
          nationalityMap.set(nationality, {
            nationality,
            totalPax: 0,
            totalRevenue: 0,
            uniqueGuests: new Set(),
          });
        }

        const stats = nationalityMap.get(nationality)!;
        stats.totalPax += pax;
        stats.totalRevenue += booking.total_amount || 0;
        stats.uniqueGuests.add(booking.guest_id);
      });

      const stats = Array.from(nationalityMap.values())
        .map(s => ({
          nationality: s.nationality,
          totalPax: s.totalPax,
          totalRevenue: s.totalRevenue,
          uniqueGuests: s.uniqueGuests.size,
        }))
        .sort((a, b) => b.totalPax - a.totalPax);

      return stats;
    },
    enabled: !!currentResort && segmentType === 'activities',
  });

  // Fetch restaurants report data
  const { data: restaurantsData, isLoading: loadingRestaurants } = useQuery({
    queryKey: ['market-report-restaurants', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return null;

      const { data: reservations, error } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          num_adults,
          num_children,
          guest_id,
          restaurant_slot_id,
          restaurant_time_slots!inner(date),
          guests!inner(id, nationality)
        `)
        .eq('resort_id', currentResort.id)
        .in('status', ['CONFIRMED', 'COMPLETED'])
        .gte('restaurant_time_slots.date', startDate)
        .lte('restaurant_time_slots.date', endDate);

      if (error) throw error;

      // Aggregate by nationality
      const nationalityMap = new Map<string, {
        nationality: string;
        totalPax: number;
        uniqueGuests: Set<string>;
      }>();

      reservations?.forEach((res: any) => {
        const nationality = res.guests?.nationality || 'Unknown';
        const pax = (res.num_adults || 0) + (res.num_children || 0);

        if (!nationalityMap.has(nationality)) {
          nationalityMap.set(nationality, {
            nationality,
            totalPax: 0,
            uniqueGuests: new Set(),
          });
        }

        const stats = nationalityMap.get(nationality)!;
        stats.totalPax += pax;
        stats.uniqueGuests.add(res.guest_id);
      });

      const stats = Array.from(nationalityMap.values())
        .map(s => ({
          nationality: s.nationality,
          totalPax: s.totalPax,
          totalRevenue: 0, // Restaurants don't track revenue
          uniqueGuests: s.uniqueGuests.size,
        }))
        .sort((a, b) => b.totalPax - a.totalPax);

      return stats;
    },
    enabled: !!currentResort && segmentType === 'restaurants',
  });

  const reportData = segmentType === 'activities' ? activitiesData : restaurantsData;
  const isLoading = segmentType === 'activities' ? loadingActivities : loadingRestaurants;

  const chartData = useMemo(() => {
    if (!reportData) return [];
    return reportData.slice(0, 10).map(item => ({
      name: item.nationality.length > 12 ? item.nationality.substring(0, 12) + '...' : item.nationality,
      pax: item.totalPax,
    }));
  }, [reportData]);

  const pieData = useMemo(() => {
    if (!reportData) return [];
    const top5 = reportData.slice(0, 5);
    const others = reportData.slice(5);
    const othersPax = others.reduce((sum, item) => sum + item.totalPax, 0);
    
    const result = top5.map(item => ({
      name: item.nationality,
      value: item.totalPax,
    }));
    
    if (othersPax > 0) {
      result.push({ name: 'Others', value: othersPax });
    }
    
    return result;
  }, [reportData]);

  const exportCSV = () => {
    if (!reportData) return;

    const headers = segmentType === 'activities'
      ? ['Nationality', 'Total Pax', 'Total Revenue', 'Unique Guests']
      : ['Nationality', 'Total Pax', 'Unique Guests'];
    
    const rows = reportData.map(item => {
      if (segmentType === 'activities') {
        return [
          `"${item.nationality}"`,
          item.totalPax,
          item.totalRevenue.toFixed(2),
          item.uniqueGuests,
        ];
      }
      return [
        `"${item.nationality}"`,
        item.totalPax,
        item.uniqueGuests,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `market-report-${segmentType}-${startDate}-to-${endDate}.csv`;
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
          <h1 className="text-3xl font-bold text-foreground">Market Report</h1>
          <p className="text-muted-foreground">Booking analysis by guest nationality</p>
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
              <Label>Segment</Label>
              <Select value={segmentType} onValueChange={(v) => setSegmentType(v as SegmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="restaurants">Restaurants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pax Distribution by Nationality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Nationalities by Pax</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="pax" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Nationality Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nationality</TableHead>
                  <TableHead className="text-right">Total Pax</TableHead>
                  {segmentType === 'activities' && (
                    <TableHead className="text-right">Total Revenue</TableHead>
                  )}
                  <TableHead className="text-right">Unique Guests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={segmentType === 'activities' ? 4 : 3} className="text-center text-muted-foreground">
                      No data for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {item.nationality}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.totalPax}</TableCell>
                      {segmentType === 'activities' && (
                        <TableCell className="text-right">
                          {currentResort?.currency} {item.totalRevenue.toLocaleString()}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{item.uniqueGuests}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AIInsightsPanel
        reportType="market"
        reportData={{ segmentType, data: reportData }}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
