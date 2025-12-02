import { useState, useEffect } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterBar, FilterBarGroup } from '@/components/ui/filter-bar';
import { StatCard } from '@/components/ui/stat-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, UtensilsCrossed, Sparkles, Loader2, CalendarClock, Zap } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';

interface DateRange {
  start: string;
  end: string;
}

interface SalesMetrics {
  totalRevenue: number;
  revenuePerGuest: number;
  activityAttachRate: number;
  fnbCaptureRate: number;
  cancellationLoss: number;
  preStayRevenue: number;
  inStayUpsellRevenue: number;
  normalRevenue: number;
  preStayBookings: number;
  inStayUpsellBookings: number;
}

interface ActivitySales {
  activityId: string;
  activityName: string;
  totalRevenue: number;
  totalPax: number;
  avgRevenuePerPax: number;
  sessions: number;
  avgOccupancy: number;
  cancellationLoss: number;
  cancellationRate: number;
}

interface RestaurantSales {
  restaurantId: string;
  restaurantName: string;
  totalRevenue: number;
  totalCovers: number;
  avgCheckPerCover: number;
  avgOccupancy: number;
  cancellationLoss: number;
  cancellationRate: number;
}

interface SegmentData {
  segment: string;
  guests: number;
  totalRevenue: number;
  revenuePerGuest: number;
  activityAttachRate: number;
  fnbCaptureRate: number;
  cancellationRate: number;
}

interface UpsellItem {
  type: 'Activity' | 'Restaurant';
  name: string;
  bookings: number;
  revenue: number;
}

export default function SalesPerformanceReport() {
  const { currentResort } = useResort();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = subDays(end, 30);
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  });
  const [datePreset, setDatePreset] = useState('last30');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [activitySales, setActivitySales] = useState<ActivitySales[]>([]);
  const [restaurantSales, setRestaurantSales] = useState<RestaurantSales[]>([]);
  const [channelData, setChannelData] = useState<SegmentData[]>([]);
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const end = new Date();
    let start: Date;

    switch (preset) {
      case 'last7':
        start = subDays(end, 7);
        break;
      case 'last30':
        start = subDays(end, 30);
        break;
      case 'thisMonth':
        start = startOfMonth(end);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(end, 1));
        setDateRange({
          start: format(start, 'yyyy-MM-dd'),
          end: format(endOfMonth(start), 'yyyy-MM-dd')
        });
        return;
      default:
        start = subDays(end, 30);
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  useEffect(() => {
    if (currentResort) {
      fetchSalesData();
    }
  }, [currentResort, dateRange]);

  const fetchSalesData = async () => {
    if (!currentResort) return;
    setLoading(true);

    try {
      // Fetch guests in period for denominator
      const { data: guestsData } = await supabase
        .from('guests')
        .select('id, channel')
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', dateRange.end)
        .gte('check_out_date', dateRange.start);

      const totalGuests = guestsData?.length || 1; // Avoid division by zero
      const guestIds = guestsData?.map(g => g.id) || [];

      // Fetch activity bookings
      const { data: activityBookings } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          total_amount,
          num_adults,
          num_children,
          status,
          guest_id,
          session_id,
          booking_source,
          activity_sessions(activity_id, date, capacity, activities(name))
        `)
        .eq('resort_id', currentResort.id)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59');

      // Fetch restaurant reservations
      const { data: restaurantReservations } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          total_amount,
          num_adults,
          num_children,
          status,
          guest_id,
          restaurant_slot_id,
          booking_source,
          restaurant_time_slots(restaurant_id, capacity, restaurants(name))
        `)
        .eq('resort_id', currentResort.id)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59');

      // Calculate metrics
      const activityRevenue = activityBookings
        ?.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

      const restaurantRevenue = restaurantReservations
        ?.filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
        .reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;

      const totalRevenue = activityRevenue + restaurantRevenue;

      const guestsWithActivities = new Set(
        activityBookings?.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
          .map(b => b.guest_id)
      ).size;

      const guestsWithRestaurants = new Set(
        restaurantReservations?.filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
          .map(r => r.guest_id)
      ).size;

      const cancellationLoss = 
        (activityBookings?.filter(b => b.status === 'CANCELLED').reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0) +
        (restaurantReservations?.filter(r => r.status === 'CANCELLED').reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0);

      // Calculate booking source metrics
      const confirmedActivityBookings = activityBookings?.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED') || [];
      const confirmedRestaurantReservations = restaurantReservations?.filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED') || [];

      const activityPreStayRevenue = confirmedActivityBookings
        .filter(b => b.booking_source === 'PRE_STAY')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);
      
      const activityInStayRevenue = confirmedActivityBookings
        .filter(b => b.booking_source === 'IN_STAY_SUGGESTION')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);
      
      const restaurantPreStayRevenue = confirmedRestaurantReservations
        .filter(r => r.booking_source === 'PRE_STAY')
        .reduce((sum, r) => sum + (r.total_amount || 0), 0);
      
      const restaurantInStayRevenue = confirmedRestaurantReservations
        .filter(r => r.booking_source === 'IN_STAY_SUGGESTION')
        .reduce((sum, r) => sum + (r.total_amount || 0), 0);

      const preStayRevenue = activityPreStayRevenue + restaurantPreStayRevenue;
      const inStayUpsellRevenue = activityInStayRevenue + restaurantInStayRevenue;
      const normalRevenue = totalRevenue - preStayRevenue - inStayUpsellRevenue;

      const preStayBookings = 
        confirmedActivityBookings.filter(b => b.booking_source === 'PRE_STAY').length +
        confirmedRestaurantReservations.filter(r => r.booking_source === 'PRE_STAY').length;
      
      const inStayUpsellBookings = 
        confirmedActivityBookings.filter(b => b.booking_source === 'IN_STAY_SUGGESTION').length +
        confirmedRestaurantReservations.filter(r => r.booking_source === 'IN_STAY_SUGGESTION').length;

      setMetrics({
        totalRevenue,
        revenuePerGuest: totalRevenue / totalGuests,
        activityAttachRate: (guestsWithActivities / totalGuests) * 100,
        fnbCaptureRate: (guestsWithRestaurants / totalGuests) * 100,
        cancellationLoss,
        preStayRevenue,
        inStayUpsellRevenue,
        normalRevenue,
        preStayBookings,
        inStayUpsellBookings
      });

      // Build upsell items list
      const upsellMap = new Map<string, UpsellItem>();

      confirmedActivityBookings
        .filter(b => b.booking_source === 'IN_STAY_SUGGESTION')
        .forEach(booking => {
          const session = booking.activity_sessions as any;
          if (!session?.activities?.name) return;
          
          const key = `activity-${session.activity_id}`;
          if (!upsellMap.has(key)) {
            upsellMap.set(key, {
              type: 'Activity',
              name: session.activities.name,
              bookings: 0,
              revenue: 0
            });
          }
          const item = upsellMap.get(key)!;
          item.bookings++;
          item.revenue += booking.total_amount || 0;
        });

      confirmedRestaurantReservations
        .filter(r => r.booking_source === 'IN_STAY_SUGGESTION')
        .forEach(reservation => {
          const slot = reservation.restaurant_time_slots as any;
          if (!slot?.restaurants?.name) return;
          
          const key = `restaurant-${slot.restaurant_id}`;
          if (!upsellMap.has(key)) {
            upsellMap.set(key, {
              type: 'Restaurant',
              name: slot.restaurants.name,
              bookings: 0,
              revenue: 0
            });
          }
          const item = upsellMap.get(key)!;
          item.bookings++;
          item.revenue += reservation.total_amount || 0;
        });

      setUpsellItems(Array.from(upsellMap.values()).sort((a, b) => b.revenue - a.revenue));

      // Activity sales breakdown
      const activityMap = new Map<string, any>();
      activityBookings?.forEach(booking => {
        const session = booking.activity_sessions as any;
        if (!session?.activities?.name) return;
        
        const activityId = session.activity_id;
        const activityName = session.activities.name;
        
        if (!activityMap.has(activityId)) {
          activityMap.set(activityId, {
            activityId,
            activityName,
            totalRevenue: 0,
            totalPax: 0,
            sessions: new Set(),
            confirmedPax: 0,
            totalCapacity: 0,
            cancellationLoss: 0,
            totalBookings: 0,
            cancelledBookings: 0
          });
        }

        const activity = activityMap.get(activityId);
        activity.sessions.add(booking.session_id);
        activity.totalBookings++;

        if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
          activity.totalRevenue += booking.total_amount || 0;
          activity.totalPax += booking.num_adults + booking.num_children;
          activity.confirmedPax += booking.num_adults + booking.num_children;
          activity.totalCapacity += session.capacity || 0;
        } else if (booking.status === 'CANCELLED') {
          activity.cancellationLoss += booking.total_amount || 0;
          activity.cancelledBookings++;
        }
      });

      const activitySalesData: ActivitySales[] = Array.from(activityMap.values()).map(a => ({
        activityId: a.activityId,
        activityName: a.activityName,
        totalRevenue: a.totalRevenue,
        totalPax: a.totalPax,
        avgRevenuePerPax: a.totalPax > 0 ? a.totalRevenue / a.totalPax : 0,
        sessions: a.sessions.size,
        avgOccupancy: a.totalCapacity > 0 ? (a.confirmedPax / a.totalCapacity) * 100 : 0,
        cancellationLoss: a.cancellationLoss,
        cancellationRate: a.totalBookings > 0 ? (a.cancelledBookings / a.totalBookings) * 100 : 0
      }));

      setActivitySales(activitySalesData.sort((a, b) => b.totalRevenue - a.totalRevenue));

      // Restaurant sales breakdown
      const restaurantMap = new Map<string, any>();
      restaurantReservations?.forEach(reservation => {
        const slot = reservation.restaurant_time_slots as any;
        if (!slot?.restaurants?.name) return;
        
        const restaurantId = slot.restaurant_id;
        const restaurantName = slot.restaurants.name;
        
        if (!restaurantMap.has(restaurantId)) {
          restaurantMap.set(restaurantId, {
            restaurantId,
            restaurantName,
            totalRevenue: 0,
            totalCovers: 0,
            totalCapacity: 0,
            confirmedCovers: 0,
            cancellationLoss: 0,
            totalReservations: 0,
            cancelledReservations: 0
          });
        }

        const restaurant = restaurantMap.get(restaurantId);
        restaurant.totalReservations++;

        if (reservation.status === 'CONFIRMED' || reservation.status === 'COMPLETED') {
          restaurant.totalRevenue += reservation.total_amount || 0;
          restaurant.totalCovers += reservation.num_adults + reservation.num_children;
          restaurant.confirmedCovers += reservation.num_adults + reservation.num_children;
          restaurant.totalCapacity += slot.capacity || 0;
        } else if (reservation.status === 'CANCELLED') {
          restaurant.cancellationLoss += reservation.total_amount || 0;
          restaurant.cancelledReservations++;
        }
      });

      const restaurantSalesData: RestaurantSales[] = Array.from(restaurantMap.values()).map(r => ({
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName,
        totalRevenue: r.totalRevenue,
        totalCovers: r.totalCovers,
        avgCheckPerCover: r.totalCovers > 0 ? r.totalRevenue / r.totalCovers : 0,
        avgOccupancy: r.totalCapacity > 0 ? (r.confirmedCovers / r.totalCapacity) * 100 : 0,
        cancellationLoss: r.cancellationLoss,
        cancellationRate: r.totalReservations > 0 ? (r.cancelledReservations / r.totalReservations) * 100 : 0
      }));

      setRestaurantSales(restaurantSalesData.sort((a, b) => b.totalRevenue - a.totalRevenue));

      // Channel segment analysis
      const channelMap = new Map<string, any>();
      guestsData?.forEach(guest => {
        const channel = guest.channel || 'Unknown';
        if (!channelMap.has(channel)) {
          channelMap.set(channel, {
            guests: 0,
            activityRevenue: 0,
            restaurantRevenue: 0,
            guestsWithActivities: new Set(),
            guestsWithRestaurants: new Set(),
            cancelledValue: 0,
            totalBookings: 0
          });
        }
        
        const seg = channelMap.get(channel);
        seg.guests++;

        // Add activity data for this guest
        activityBookings?.filter(b => b.guest_id === guest.id).forEach(b => {
          if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
            seg.activityRevenue += b.total_amount || 0;
            seg.guestsWithActivities.add(guest.id);
          } else if (b.status === 'CANCELLED') {
            seg.cancelledValue += b.total_amount || 0;
          }
          seg.totalBookings++;
        });

        // Add restaurant data for this guest
        restaurantReservations?.filter(r => r.guest_id === guest.id).forEach(r => {
          if (r.status === 'CONFIRMED' || r.status === 'COMPLETED') {
            seg.restaurantRevenue += r.total_amount || 0;
            seg.guestsWithRestaurants.add(guest.id);
          } else if (r.status === 'CANCELLED') {
            seg.cancelledValue += r.total_amount || 0;
          }
          seg.totalBookings++;
        });
      });

      const channelSegmentData: SegmentData[] = Array.from(channelMap.entries()).map(([channel, data]) => ({
        segment: channel,
        guests: data.guests,
        totalRevenue: data.activityRevenue + data.restaurantRevenue,
        revenuePerGuest: (data.activityRevenue + data.restaurantRevenue) / data.guests,
        activityAttachRate: (data.guestsWithActivities.size / data.guests) * 100,
        fnbCaptureRate: (data.guestsWithRestaurants.size / data.guests) * 100,
        cancellationRate: data.totalBookings > 0 ? (data.cancelledValue / (data.activityRevenue + data.restaurantRevenue + data.cancelledValue)) * 100 : 0
      }));

      setChannelData(channelSegmentData.sort((a, b) => b.totalRevenue - a.totalRevenue));

    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    if (!currentResort || !metrics) return;
    
    setGeneratingAI(true);
    try {
      const reportData = {
        period: { start: dateRange.start, end: dateRange.end },
        summary: metrics,
        topActivities: activitySales.slice(0, 5),
        topRestaurants: restaurantSales.slice(0, 5),
        channels: channelData,
        bookingSources: {
          preStayRevenue: metrics.preStayRevenue,
          inStayUpsellRevenue: metrics.inStayUpsellRevenue,
          preStayBookings: metrics.preStayBookings,
          inStayUpsellBookings: metrics.inStayUpsellBookings,
          topUpsellItems: upsellItems.slice(0, 5)
        }
      };

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          reportType: 'sales',
          reportData,
          resortName: currentResort.name,
          dateRange
        }
      });

      if (error) throw error;
      setAiInsights(data.insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (!currentResort) {
    return <div>Please select a resort</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sales Performance</h1>
        <p className="text-muted-foreground">Revenue metrics and sales analytics</p>
      </div>

      <FilterBar>
        <FilterBarGroup>
          <Select value={datePreset} onValueChange={applyDatePreset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
            </SelectContent>
          </Select>
        </FilterBarGroup>
      </FilterBar>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Revenue"
              value={`${currentResort.currency} ${metrics?.totalRevenue.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              description="Ancillary revenue"
            />
            <StatCard
              title="Revenue per Guest"
              value={`${currentResort.currency} ${metrics?.revenuePerGuest.toFixed(2) || '0.00'}`}
              icon={TrendingUp}
              description="Average per in-house guest"
            />
            <StatCard
              title="Activity Attach Rate"
              value={`${metrics?.activityAttachRate.toFixed(1) || '0.0'}%`}
              icon={Users}
              description="Guests who booked activities"
            />
            <StatCard
              title="F&B Capture Rate"
              value={`${metrics?.fnbCaptureRate.toFixed(1) || '0.0'}%`}
              icon={UtensilsCrossed}
              description="Guests with reservations"
            />
            <StatCard
              title="Cancellation Loss"
              value={`${currentResort.currency} ${metrics?.cancellationLoss.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              description="Revenue lost to cancellations"
              variant="destructive"
            />
          </div>

          {/* Booking Source Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Pre-stay Revenue"
              value={`${currentResort.currency} ${metrics?.preStayRevenue.toFixed(2) || '0.00'}`}
              icon={CalendarClock}
              description={`Bookings before arrival • ${metrics?.preStayBookings || 0} bookings • ${metrics?.totalRevenue > 0 ? ((metrics.preStayRevenue / metrics.totalRevenue) * 100).toFixed(1) : '0.0'}% of total`}
              variant="success"
            />
            <StatCard
              title="In-stay Upsell Revenue"
              value={`${currentResort.currency} ${metrics?.inStayUpsellRevenue.toFixed(2) || '0.00'}`}
              icon={Zap}
              description={`From portal suggestions • ${metrics?.inStayUpsellBookings || 0} bookings • ${metrics?.totalRevenue > 0 ? ((metrics.inStayUpsellRevenue / metrics.totalRevenue) * 100).toFixed(1) : '0.0'}% of total`}
              variant="success"
            />
          </div>

          {/* AI Revenue Coach */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Revenue Coach (AI)
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Data-driven suggestions to improve ancillary sales
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {aiInsights && (
                    <Button
                      onClick={generateAIInsights}
                      disabled={generatingAI}
                      size="sm"
                      variant="outline"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  )}
                  {!aiInsights && (
                    <Button
                      onClick={generateAIInsights}
                      disabled={generatingAI}
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Insights
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {aiInsights && (
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="space-y-6">
                    <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                      {aiInsights}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
            {!aiInsights && !generatingAI && (
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered analysis of your sales performance with actionable recommendations
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    The AI will analyze your revenue metrics, attach rates, top performers, and segment data to provide specific suggestions for improvement
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Booking Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Where your bookings come from</CardTitle>
              <CardDescription>Revenue split by booking channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={[
                    { 
                      name: 'Normal', 
                      revenue: metrics?.normalRevenue || 0,
                      fill: 'hsl(var(--primary))' 
                    },
                    { 
                      name: 'Pre-stay', 
                      revenue: metrics?.preStayRevenue || 0,
                      fill: 'hsl(var(--chart-2))' 
                    },
                    { 
                      name: 'In-stay upsell', 
                      revenue: metrics?.inStayUpsellRevenue || 0,
                      fill: 'hsl(var(--chart-3))' 
                    }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${currentResort.currency} ${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {metrics?.totalRevenue > 0 ? ((metrics.normalRevenue / metrics.totalRevenue) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Normal bookings</div>
                  <div className="text-xs text-muted-foreground">{currentResort.currency} {metrics?.normalRevenue.toFixed(2) || '0.00'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-2">
                    {metrics?.totalRevenue > 0 ? ((metrics.preStayRevenue / metrics.totalRevenue) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Pre-arrival</div>
                  <div className="text-xs text-muted-foreground">{currentResort.currency} {metrics?.preStayRevenue.toFixed(2) || '0.00'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-3">
                    {metrics?.totalRevenue > 0 ? ((metrics.inStayUpsellRevenue / metrics.totalRevenue) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">In-stay upsells</div>
                  <div className="text-xs text-muted-foreground">{currentResort.currency} {metrics?.inStayUpsellRevenue.toFixed(2) || '0.00'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* In-stay Upsell Effectiveness */}
          <Card className="border-chart-3/30 bg-gradient-to-br from-card to-chart-3/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-chart-3" />
                In-stay Upsell Effectiveness
              </CardTitle>
              <CardDescription>
                Performance of smart suggestions shown during the guest stay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {metrics && metrics.inStayUpsellRevenue > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground mb-1">Bookings from suggestions</div>
                      <div className="text-2xl font-bold text-foreground">{metrics.inStayUpsellBookings}</div>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground mb-1">Revenue from suggestions</div>
                      <div className="text-2xl font-bold text-foreground">
                        {currentResort.currency} {metrics.inStayUpsellRevenue.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {upsellItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-foreground">Top performers from suggestions</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-border">
                            <tr className="text-left">
                              <th className="pb-2 font-medium">Type</th>
                              <th className="pb-2 font-medium">Name</th>
                              <th className="pb-2 font-medium text-right">Bookings</th>
                              <th className="pb-2 font-medium text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {upsellItems.map((item, idx) => (
                              <tr key={idx} className="border-b border-border/50">
                                <td className="py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    item.type === 'Activity' ? 'bg-primary/10 text-primary' : 'bg-chart-2/10 text-chart-2'
                                  }`}>
                                    {item.type}
                                  </span>
                                </td>
                                <td className="py-3 font-medium">{item.name}</td>
                                <td className="py-3 text-right">{item.bookings}</td>
                                <td className="py-3 text-right font-medium">
                                  {currentResort.currency} {item.revenue.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No bookings from in-stay suggestions in this period.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Smart suggestions appear on guest home when they have light plans.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pre-stay Planning Impact */}
          <Card className="border-chart-2/30 bg-gradient-to-br from-card to-chart-2/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-chart-2" />
                Pre-stay Planning Impact
              </CardTitle>
              <CardDescription>
                Revenue secured before guests arrive via pre-arrival links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {metrics && metrics.preStayRevenue > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground mb-1">Bookings before arrival</div>
                      <div className="text-2xl font-bold text-foreground">{metrics.preStayBookings}</div>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground mb-1">Pre-stay revenue</div>
                      <div className="text-2xl font-bold text-foreground">
                        {currentResort.currency} {metrics.preStayRevenue.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-sm text-muted-foreground mb-1">Share of total revenue</div>
                      <div className="text-2xl font-bold text-chart-2">
                        {((metrics.preStayRevenue / metrics.totalRevenue) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg p-4 border">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Pre-stay bookings reduce operational pressure</strong> and increase revenue certainty. 
                      Guests who plan before arrival are more engaged and have a better experience. Track this metric to measure 
                      the effectiveness of your pre-arrival communication strategy.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CalendarClock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No bookings from pre-arrival planning in this period.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Generate pre-arrival links for guests to enable planning before arrival.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Sales & Profitability</CardTitle>
              <CardDescription>Revenue performance by activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activitySales.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="activityName" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Activity</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-right">Pax</th>
                      <th className="pb-2 font-medium text-right">Avg/Pax</th>
                      <th className="pb-2 font-medium text-right">Sessions</th>
                      <th className="pb-2 font-medium text-right">Occupancy</th>
                      <th className="pb-2 font-medium text-right">Cancel Loss</th>
                      <th className="pb-2 font-medium text-right">Cancel %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitySales.map((activity) => (
                      <tr key={activity.activityId} className="border-b border-border/50">
                        <td className="py-3">{activity.activityName}</td>
                        <td className="py-3 text-right font-medium">{currentResort.currency} {activity.totalRevenue.toFixed(2)}</td>
                        <td className="py-3 text-right">{activity.totalPax}</td>
                        <td className="py-3 text-right">{currentResort.currency} {activity.avgRevenuePerPax.toFixed(2)}</td>
                        <td className="py-3 text-right">{activity.sessions}</td>
                        <td className="py-3 text-right">{activity.avgOccupancy.toFixed(1)}%</td>
                        <td className="py-3 text-right text-destructive">{currentResort.currency} {activity.cancellationLoss.toFixed(2)}</td>
                        <td className="py-3 text-right">{activity.cancellationRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant & F&B Sales</CardTitle>
              <CardDescription>Revenue performance by restaurant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={restaurantSales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="restaurantName" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Restaurant</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-right">Covers</th>
                      <th className="pb-2 font-medium text-right">Avg Check</th>
                      <th className="pb-2 font-medium text-right">Occupancy</th>
                      <th className="pb-2 font-medium text-right">Cancel Loss</th>
                      <th className="pb-2 font-medium text-right">Cancel %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurantSales.map((restaurant) => (
                      <tr key={restaurant.restaurantId} className="border-b border-border/50">
                        <td className="py-3">{restaurant.restaurantName}</td>
                        <td className="py-3 text-right font-medium">{currentResort.currency} {restaurant.totalRevenue.toFixed(2)}</td>
                        <td className="py-3 text-right">{restaurant.totalCovers}</td>
                        <td className="py-3 text-right">{currentResort.currency} {restaurant.avgCheckPerCover.toFixed(2)}</td>
                        <td className="py-3 text-right">{restaurant.avgOccupancy.toFixed(1)}%</td>
                        <td className="py-3 text-right text-destructive">{currentResort.currency} {restaurant.cancellationLoss.toFixed(2)}</td>
                        <td className="py-3 text-right">{restaurant.cancellationRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Segments & Channels */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Channel</CardTitle>
              <CardDescription>Guest segments and booking channels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="pb-2 font-medium">Channel</th>
                      <th className="pb-2 font-medium text-right">Guests</th>
                      <th className="pb-2 font-medium text-right">Total Revenue</th>
                      <th className="pb-2 font-medium text-right">Revenue/Guest</th>
                      <th className="pb-2 font-medium text-right">Activity Attach</th>
                      <th className="pb-2 font-medium text-right">F&B Capture</th>
                      <th className="pb-2 font-medium text-right">Cancel %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelData.map((channel) => (
                      <tr key={channel.segment} className="border-b border-border/50">
                        <td className="py-3 font-medium">{channel.segment}</td>
                        <td className="py-3 text-right">{channel.guests}</td>
                        <td className="py-3 text-right font-medium">{currentResort.currency} {channel.totalRevenue.toFixed(2)}</td>
                        <td className="py-3 text-right">{currentResort.currency} {channel.revenuePerGuest.toFixed(2)}</td>
                        <td className="py-3 text-right">{channel.activityAttachRate.toFixed(1)}%</td>
                        <td className="py-3 text-right">{channel.fnbCaptureRate.toFixed(1)}%</td>
                        <td className="py-3 text-right">{channel.cancellationRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
