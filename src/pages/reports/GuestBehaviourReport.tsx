import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, differenceInDays, parseISO, getDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, Users, Activity, TrendingUp, RefreshCw, Clock, Calendar } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { DateRangePresets } from '@/components/reports/DateRangePresets';
import { ReportStatCard } from '@/components/reports/ReportStatCard';
import { TrendChart } from '@/components/reports/TrendChart';
import { DayOfWeekChart } from '@/components/reports/DayOfWeekChart';
import { LeadTimeDistribution } from '@/components/reports/LeadTimeDistribution';
import { useTierAccess } from '@/hooks/useTierAccess';
import { TierGate } from '@/components/tier/TierGate';

const DISTRIBUTION_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];
const CATEGORY_COLORS: Record<string, string> = {
  DIVE: 'hsl(var(--chart-1))',
  EXCURSION: 'hsl(var(--chart-2))',
  WATERSPORT: 'hsl(var(--chart-3))',
  SPA: 'hsl(var(--chart-4))',
  OTHER: 'hsl(var(--chart-5))',
};

export default function GuestBehaviourReport() {
  const { currentResort } = useResort();
  const { isAtLeastElite } = useTierAccess();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Fetch comprehensive report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['guest-behaviour-report-enhanced', currentResort?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentResort) return null;

      // Fetch activity bookings with guest and session info
      const { data: bookings, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          guest_id,
          created_at,
          num_adults,
          num_children,
          total_amount,
          booking_source,
          activity_sessions!inner(
            date,
            start_time,
            activity_id,
            activities!inner(
              name,
              category,
              duration_minutes
            )
          ),
          guests!inner(
            id,
            full_name,
            room_number,
            nationality,
            check_in_date,
            check_out_date,
            email
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
        email: string | null;
        checkInDate: string;
        checkOutDate: string;
        activityCount: number;
        totalSpend: number;
        categories: Set<string>;
        bookingDates: string[];
        leadTimes: number[];
        firstBookingDate: string | null;
      }>();

      // Tracking for analytics
      const categoryBookings: Record<string, number> = {};
      const bookingsByDayOfWeek: number[] = [0, 0, 0, 0, 0, 0, 0];
      const dailyBookings: Record<string, number> = {};
      const leadTimeDistribution = {
        sameDay: 0,
        oneDay: 0,
        twoDays: 0,
        threePlusDays: 0,
        weekPlus: 0,
      };
      const timeSlotBookings: Record<string, number> = {};
      let repeatGuestCount = 0;
      const guestEmails = new Set<string>();

      bookings?.forEach((booking: any) => {
        const guest = booking.guests;
        const session = booking.activity_sessions;
        const activity = session.activities;
        const sessionDate = parseISO(session.date);
        const createdDate = parseISO(booking.created_at);
        
        // Calculate lead time (days between booking and session)
        const leadTime = differenceInDays(sessionDate, createdDate);
        
        // Track lead time distribution
        if (leadTime <= 0) leadTimeDistribution.sameDay++;
        else if (leadTime === 1) leadTimeDistribution.oneDay++;
        else if (leadTime === 2) leadTimeDistribution.twoDays++;
        else if (leadTime < 7) leadTimeDistribution.threePlusDays++;
        else leadTimeDistribution.weekPlus++;
        
        // Track day of week for session
        const dayOfWeek = getDay(sessionDate);
        bookingsByDayOfWeek[dayOfWeek]++;
        
        // Track daily bookings for trend
        const dateKey = session.date;
        dailyBookings[dateKey] = (dailyBookings[dateKey] || 0) + 1;
        
        // Track category
        categoryBookings[activity.category] = (categoryBookings[activity.category] || 0) + 1;
        
        // Track time slots
        const hour = parseInt(session.start_time.split(':')[0]);
        const timeSlot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
        timeSlotBookings[timeSlot] = (timeSlotBookings[timeSlot] || 0) + 1;
        
        // Track repeat guests by email
        if (guest.email) {
          if (guestEmails.has(guest.email)) {
            repeatGuestCount++;
          }
          guestEmails.add(guest.email);
        }

        if (!guestMap.has(guest.id)) {
          guestMap.set(guest.id, {
            guestId: guest.id,
            fullName: guest.full_name,
            roomNumber: guest.room_number,
            nationality: guest.nationality,
            email: guest.email,
            checkInDate: guest.check_in_date,
            checkOutDate: guest.check_out_date,
            activityCount: 0,
            totalSpend: 0,
            categories: new Set(),
            bookingDates: [],
            leadTimes: [],
            firstBookingDate: null,
          });
        }
        
        const guestData = guestMap.get(guest.id)!;
        guestData.activityCount += 1;
        guestData.totalSpend += booking.total_amount || 0;
        guestData.categories.add(activity.category);
        guestData.bookingDates.push(session.date);
        guestData.leadTimes.push(leadTime);
        if (!guestData.firstBookingDate || booking.created_at < guestData.firstBookingDate) {
          guestData.firstBookingDate = booking.created_at;
        }
      });

      const guestStats = Array.from(guestMap.values()).map(g => ({
        ...g,
        categoriesCount: g.categories.size,
        avgLeadTime: g.leadTimes.length > 0 
          ? g.leadTimes.reduce((a, b) => a + b, 0) / g.leadTimes.length 
          : 0,
        stayLength: differenceInDays(parseISO(g.checkOutDate), parseISO(g.checkInDate)),
      }));
      
      const uniqueGuests = guestStats.length;
      const totalActivities = guestStats.reduce((sum, g) => sum + g.activityCount, 0);
      const avgActivitiesPerGuest = uniqueGuests > 0 
        ? Math.round((totalActivities / uniqueGuests) * 10) / 10 
        : 0;
      const totalRevenue = guestStats.reduce((sum, g) => sum + g.totalSpend, 0);

      // Distribution buckets
      const oneActivity = guestStats.filter(g => g.activityCount === 1).length;
      const twoThreeActivities = guestStats.filter(g => g.activityCount >= 2 && g.activityCount <= 3).length;
      const fourPlusActivities = guestStats.filter(g => g.activityCount >= 4).length;

      const distribution = [
        { name: '1 activity', value: oneActivity },
        { name: '2-3 activities', value: twoThreeActivities },
        { name: '4+ activities', value: fourPlusActivities },
      ].filter(d => d.value > 0);

      // Category breakdown
      const categoryData = Object.entries(categoryBookings)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Time slot breakdown
      const timeSlotData = Object.entries(timeSlotBookings)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
          const order = ['Morning', 'Afternoon', 'Evening'];
          return order.indexOf(a.name) - order.indexOf(b.name);
        });

      // Top engaged guests chart data
      const topGuests = guestStats
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10)
        .map(g => ({
          name: g.fullName.length > 15 ? g.fullName.substring(0, 15) + '...' : g.fullName,
          activities: g.activityCount,
          spend: g.totalSpend,
        }));

      // Daily trend data
      const dailyTrendData = Object.entries(dailyBookings)
        .map(([date, value]) => ({ date: format(parseISO(date), 'MMM dd'), value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Multi-activity guests (booking diversity)
      const multiCategoryGuests = guestStats.filter(g => g.categoriesCount > 1).length;

      // Sort guests by activity count descending
      guestStats.sort((a, b) => b.activityCount - a.activityCount);

      return {
        summary: {
          uniqueGuests,
          avgActivitiesPerGuest,
          totalActivities,
          totalRevenue,
          mostEngaged: guestStats[0]?.activityCount || 0,
          repeatGuestCount,
          multiCategoryGuests,
          avgSpendPerGuest: uniqueGuests > 0 ? totalRevenue / uniqueGuests : 0,
        },
        distribution,
        categoryData,
        timeSlotData,
        topGuests,
        guestStats,
        dailyTrendData,
        bookingsByDayOfWeek,
        leadTimeDistribution,
      };
    },
    enabled: !!currentResort,
  });

  const exportCSV = () => {
    if (!reportData) return;

    const headers = ['Guest Name', 'Room', 'Nationality', 'Check-in', 'Check-out', 'Stay Length', 'Activities', 'Categories', 'Total Spend', 'Avg Lead Time'];
    const rows = reportData.guestStats.map(guest => [
      `"${guest.fullName}"`,
      guest.roomNumber,
      guest.nationality || '',
      guest.checkInDate,
      guest.checkOutDate,
      guest.stayLength,
      guest.activityCount,
      guest.categoriesCount,
      guest.totalSpend.toFixed(2),
      guest.avgLeadTime.toFixed(1),
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
            Activity engagement and booking pattern analysis
          </p>
        </div>
        <Button onClick={exportCSV} disabled={!reportData} variant="outline">
          <Download className="mr-2 h-4 w-4" />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportStatCard
          title="Unique Guests"
          value={reportData?.summary.uniqueGuests || 0}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Avg Activities/Guest"
          value={reportData?.summary.avgActivitiesPerGuest || 0}
          icon={<Activity className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Total Revenue"
          value={`${currentResort.currency} ${(reportData?.summary.totalRevenue || 0).toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
        <ReportStatCard
          title="Multi-Category Guests"
          value={reportData?.summary.multiCategoryGuests || 0}
          subtitle="Tried multiple categories"
          icon={<RefreshCw className="h-5 w-5 text-chart-2" />}
        />
      </div>

      {/* Elite-tier Advanced Analytics */}
      <TierGate feature="reports_sales_performance" fallback="hide">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Time Distribution */}
          {reportData?.leadTimeDistribution && (
            <LeadTimeDistribution
              title="Booking Lead Time"
              description="How far ahead guests book"
              data={reportData.leadTimeDistribution}
              valueLabel="Bookings"
            />
          )}

          {/* Day of Week Pattern */}
          {reportData?.bookingsByDayOfWeek && (
            <DayOfWeekChart
              title="Bookings by Day"
              description="Activity sessions by day of week"
              data={reportData.bookingsByDayOfWeek}
              valueLabel="Sessions"
            />
          )}

          {/* Time Slot Preferences */}
          {reportData?.timeSlotData && reportData.timeSlotData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Time Preferences
                </CardTitle>
                <CardDescription>When guests prefer to book</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reportData.timeSlotData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Booking Trend */}
        {reportData?.dailyTrendData && reportData.dailyTrendData.length > 0 && (
          <TrendChart
            title="Daily Booking Trend"
            description="Activity bookings over time"
            data={reportData.dailyTrendData}
            valueLabel="Bookings"
          />
        )}
      </TierGate>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Category Breakdown */}
        {reportData?.categoryData && reportData.categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bookings by Category</CardTitle>
              <CardDescription>Activity type preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.categoryData} layout="vertical">
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
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {reportData.categoryData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Engaged Guests */}
      {reportData?.topGuests && reportData.topGuests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Engaged Guests</CardTitle>
            <CardDescription>Top 10 by activity bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.topGuests} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'activities' ? value : `${currentResort.currency} ${value.toFixed(2)}`,
                      name === 'activities' ? 'Activities' : 'Spend'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="activities" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Activities" />
                </BarChart>
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
                  <TableHead className="text-right">Categories</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.guestStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No guests with activity bookings in the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData?.guestStats.slice(0, 50).map((guest) => (
                    <TableRow key={guest.guestId}>
                      <TableCell className="font-medium">{guest.fullName}</TableCell>
                      <TableCell>{guest.roomNumber}</TableCell>
                      <TableCell>{guest.nationality || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(guest.checkInDate), 'dd MMM')} - {format(new Date(guest.checkOutDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">{guest.activityCount}</TableCell>
                      <TableCell className="text-right">{guest.categoriesCount}</TableCell>
                      <TableCell className="text-right">{currentResort.currency} {guest.totalSpend.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AIInsightsPanel
        reportType="guest-behaviour"
        reportData={reportData || {}}
        resortName={currentResort.name}
        dateRange={{ start: startDate, end: endDate }}
      />
    </div>
  );
}
