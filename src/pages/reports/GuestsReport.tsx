import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterBar, FilterBarGroup } from '@/components/ui/filter-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Users, Bed, Calendar } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { format, subDays, differenceInDays } from 'date-fns';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function GuestsReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests-report', currentResort?.id, startDate, endDate, channelFilter],
    queryFn: async () => {
      if (!currentResort) return [];
      
      let query = supabase
        .from('guests')
        .select('*')
        .eq('resort_id', currentResort.id)
        .gte('check_in_date', startDate)
        .lte('check_in_date', endDate);

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort,
  });

  const reportData = useMemo(() => {
    const totalGuests = guests.length;

    // Calculate room nights and avg length of stay
    const stayLengths = guests.map(g => {
      return differenceInDays(new Date(g.check_out_date), new Date(g.check_in_date));
    });
    const totalRoomNights = stayLengths.reduce((sum, len) => sum + len, 0);
    const avgLengthOfStay = totalGuests > 0 ? (totalRoomNights / totalGuests).toFixed(1) : '0';

    // Group by nationality
    const nationalityMap = new Map<string, number>();
    guests.forEach(g => {
      const nat = g.nationality || 'Unknown';
      nationalityMap.set(nat, (nationalityMap.get(nat) || 0) + 1);
    });
    const topNationalities = Array.from(nationalityMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Group by channel
    const channelMap = new Map<string, { guests: number; roomNights: number }>();
    guests.forEach((g, idx) => {
      const ch = g.channel || 'Direct';
      const existing = channelMap.get(ch) || { guests: 0, roomNights: 0 };
      existing.guests += 1;
      existing.roomNights += stayLengths[idx] || 0;
      channelMap.set(ch, existing);
    });
    const channelBreakdown = Array.from(channelMap.entries()).map(([name, data]) => ({
      name,
      guests: data.guests,
      roomNights: data.roomNights,
      avgStay: data.guests > 0 ? (data.roomNights / data.guests).toFixed(1) : '0',
    }));

    return {
      totalGuests,
      totalRoomNights,
      avgLengthOfStay,
      topNationalities,
      channelBreakdown,
    };
  }, [guests]);

  const uniqueChannels = useMemo(() => {
    const channels = new Set(guests.map(g => g.channel).filter(Boolean));
    return Array.from(channels);
  }, [guests]);

  const exportCSV = () => {
    const headers = ['Full Name', 'Room', 'Nationality', 'Channel', 'Check In', 'Check Out', 'Nights'];
    const rows = guests.map(g => [
      g.full_name,
      g.room_number,
      g.nationality || '',
      g.channel || 'Direct',
      g.check_in_date,
      g.check_out_date,
      differenceInDays(new Date(g.check_out_date), new Date(g.check_in_date)).toString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-report-${startDate}-to-${endDate}.csv`;
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
          <h1 className="text-3xl font-bold text-foreground">Guests Report</h1>
          <p className="text-muted-foreground">Guest mix, channels, and length of stay analysis</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <FilterBar>
        <FilterBarGroup>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </FilterBarGroup>
        <FilterBarGroup>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Channel</label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {uniqueChannels.map(ch => (
                  <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterBarGroup>
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Guests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{reportData.totalGuests}</span>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Room Nights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{reportData.totalRoomNights}</span>
              <Bed className="h-5 w-5 text-chart-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Length of Stay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{reportData.avgLengthOfStay}</span>
              <span className="text-sm text-muted-foreground">nights</span>
              <Calendar className="h-5 w-5 text-chart-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Nationalities</CardTitle>
            <CardDescription>Guest distribution by country</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.topNationalities} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Breakdown</CardTitle>
            <CardDescription>Bookings by source</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.channelBreakdown}
                  dataKey="guests"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {reportData.channelBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel Details</CardTitle>
          <CardDescription>Detailed breakdown by booking channel</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Guests</TableHead>
                <TableHead className="text-right">Room Nights</TableHead>
                <TableHead className="text-right">Avg Stay (nights)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.channelBreakdown.map((channel) => (
                <TableRow key={channel.name}>
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell className="text-right">{channel.guests}</TableCell>
                  <TableCell className="text-right">{channel.roomNights}</TableCell>
                  <TableCell className="text-right">{channel.avgStay}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AIInsightsPanel
        reportType="guests"
        reportData={reportData}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}