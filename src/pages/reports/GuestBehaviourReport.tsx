import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Download, Users, Activity, BarChart3 } from 'lucide-react';

const DISTRIBUTION_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function GuestBehaviourReport() {
  const { currentResort } = useResort();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['guest-behaviour-report', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return null;

      // Fetch confirmed activity bookings with guest info
      const { data: bookings, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          guest_id,
          created_at,
          guests!inner(
            id,
            full_name,
            room_number,
            nationality,
            check_in_date,
            check_out_date
          )
        `)
        .eq('resort_id', currentResort.id)
        .in('status', ['CONFIRMED', 'COMPLETED'])
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (error) throw error;

      // Aggregate by guest
      const guestMap = new Map<string, {
        guestId: string;
        fullName: string;
        roomNumber: string;
        nationality: string | null;
        checkInDate: string;
        checkOutDate: string;
        activityCount: number;
      }>();

      bookings?.forEach((booking: any) => {
        const guest = booking.guests;
        if (!guestMap.has(guest.id)) {
          guestMap.set(guest.id, {
            guestId: guest.id,
            fullName: guest.full_name,
            roomNumber: guest.room_number,
            nationality: guest.nationality,
            checkInDate: guest.check_in_date,
            checkOutDate: guest.check_out_date,
            activityCount: 0,
          });
        }
        guestMap.get(guest.id)!.activityCount += 1;
      });

      const guestStats = Array.from(guestMap.values());
      const uniqueGuests = guestStats.length;
      const totalActivities = guestStats.reduce((sum, g) => sum + g.activityCount, 0);
      const avgActivitiesPerGuest = uniqueGuests > 0 
        ? Math.round((totalActivities / uniqueGuests) * 10) / 10 
        : 0;

      // Distribution buckets
      const oneActivity = guestStats.filter(g => g.activityCount === 1).length;
      const twoThreeActivities = guestStats.filter(g => g.activityCount >= 2 && g.activityCount <= 3).length;
      const fourPlusActivities = guestStats.filter(g => g.activityCount >= 4).length;

      const distribution = [
        { name: '1 activity', value: oneActivity },
        { name: '2-3 activities', value: twoThreeActivities },
        { name: '4+ activities', value: fourPlusActivities },
      ].filter(d => d.value > 0);

      // Sort guests by activity count descending
      guestStats.sort((a, b) => b.activityCount - a.activityCount);

      return {
        summary: {
          uniqueGuests,
          avgActivitiesPerGuest,
        },
        distribution,
        guestStats,
      };
    },
    enabled: !!currentResort,
  });

  const exportCSV = () => {
    if (!reportData) return;

    const headers = ['Guest Name', 'Room', 'Nationality', 'Check-in', 'Check-out', 'Activities'];
    const rows = reportData.guestStats.map(guest => [
      `"${guest.fullName}"`,
      guest.roomNumber,
      guest.nationality || '',
      guest.checkInDate,
      guest.checkOutDate,
      guest.activityCount,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `guest-behaviour-report-${startDate}-to-${endDate}.csv`;
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
          <h1 className="text-3xl font-bold text-foreground">Guest Behaviour Report</h1>
          <p className="text-muted-foreground">
            Activity engagement analysis (based on booking date)
          </p>
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
          <CardDescription>
            Date range filters based on activity booking creation date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Guests</p>
                <p className="text-2xl font-bold">{reportData?.summary.uniqueGuests || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Activities/Guest</p>
                <p className="text-2xl font-bold">{reportData?.summary.avgActivitiesPerGuest || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      {reportData?.distribution && reportData.distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Guest Distribution by Activity Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {reportData.distribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]} />
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Stay Dates</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.guestStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No guests with activity bookings in the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.guestStats.map((guest) => (
                    <TableRow key={guest.guestId}>
                      <TableCell className="font-medium">{guest.fullName}</TableCell>
                      <TableCell>{guest.roomNumber}</TableCell>
                      <TableCell>{guest.nationality || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(guest.checkInDate), 'dd MMM')} - {format(new Date(guest.checkOutDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">{guest.activityCount}</TableCell>
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
