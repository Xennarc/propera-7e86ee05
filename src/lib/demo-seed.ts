import { supabase } from '@/integrations/supabase/client';
import { addDays, format, addHours } from 'date-fns';

const DEMO_ACTIVITIES = [
  {
    name: 'House Reef Snorkel',
    category: 'WATERSPORT' as const,
    description: 'Explore our vibrant house reef teeming with tropical fish and coral formations',
    short_description: 'Guided snorkel tour of the house reef',
    duration_minutes: 90,
    default_max_capacity: 8,
    default_price_per_person: 45,
    guest_can_book: true,
    guest_cutoff_hours: 2,
    difficulty_level: 'EASY',
    requires_approval: false,
  },
  {
    name: 'Intro Dive',
    category: 'DIVE' as const,
    description: 'Perfect for beginners. Experience the underwater world with our certified instructors',
    short_description: 'Beginner diving experience with instructor',
    duration_minutes: 180,
    default_max_capacity: 4,
    default_price_per_person: 150,
    guest_can_book: true,
    guest_cutoff_hours: 12,
    requires_approval: true,
    difficulty_level: 'EASY',
  },
  {
    name: 'Sunset Dolphin Cruise',
    category: 'EXCURSION' as const,
    description: 'Watch dolphins play in their natural habitat as the sun sets over the Indian Ocean',
    short_description: 'Evening dolphin watching trip',
    duration_minutes: 120,
    default_max_capacity: 12,
    default_price_per_person: 85,
    guest_can_book: true,
    guest_cutoff_hours: 4,
    difficulty_level: 'EASY',
    requires_approval: false,
  },
  {
    name: 'Sandbank Picnic',
    category: 'EXCURSION' as const,
    description: 'Enjoy a gourmet picnic on a pristine sandbank surrounded by turquoise waters',
    short_description: 'Private sandbank lunch experience',
    duration_minutes: 240,
    default_max_capacity: 6,
    default_price_per_person: 195,
    guest_can_book: true,
    guest_cutoff_hours: 24,
    difficulty_level: 'EASY',
    requires_approval: false,
  },
];

const DEMO_RESTAURANTS = [
  {
    name: 'Lagoon Restaurant',
    description: 'Overwater dining with stunning lagoon views. International cuisine with a Maldivian twist.',
    total_capacity: 60,
    guest_can_book: true,
    guest_cutoff_minutes: 60,
    max_pax_per_booking: 8,
    requires_approval: false,
  },
  {
    name: 'Sunset Grill',
    description: 'Beachfront BBQ and fresh seafood. Perfect for romantic dinners under the stars.',
    total_capacity: 40,
    guest_can_book: true,
    guest_cutoff_minutes: 120,
    max_pax_per_booking: 6,
    requires_approval: true,
  },
];

const DEMO_GUESTS = [
  { full_name: 'James & Sarah Wilson', room_number: '101', nationality: 'United Kingdom', daysFromNow: -2, stayLength: 7 },
  { full_name: 'Michael Chen', room_number: '102', nationality: 'Singapore', daysFromNow: -1, stayLength: 5 },
  { full_name: 'Emma & David Miller', room_number: '201', nationality: 'Australia', daysFromNow: 0, stayLength: 10 },
  { full_name: 'Hans & Ingrid Mueller', room_number: '202', nationality: 'Germany', daysFromNow: -3, stayLength: 8 },
  { full_name: 'Yuki Tanaka', room_number: '301', nationality: 'Japan', daysFromNow: 0, stayLength: 4 },
  { full_name: 'Robert & Lisa Johnson', room_number: '302', nationality: 'United States', daysFromNow: 1, stayLength: 6 },
  { full_name: 'Pierre & Marie Dubois', room_number: '401', nationality: 'France', daysFromNow: -1, stayLength: 9 },
  { full_name: 'Marco Rossi', room_number: '402', nationality: 'Italy', daysFromNow: 2, stayLength: 5 },
];

export interface SeedResult {
  activityBookings: number;
  restaurantReservations: number;
  guests: number;
  sessions: number;
  slots: number;
}

export async function seedDemoResortData(resortId: string): Promise<SeedResult> {
  const today = new Date();

  // Create activities
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .insert(DEMO_ACTIVITIES.map(a => ({ ...a, resort_id: resortId })))
    .select();

  if (activitiesError) {
    console.error('Error seeding activities:', activitiesError);
    throw activitiesError;
  }

  // Create sessions for the next 10 days
  const sessions: any[] = [];
  for (let dayOffset = 0; dayOffset <= 10; dayOffset++) {
    const sessionDate = format(addDays(today, dayOffset), 'yyyy-MM-dd');
    
    activities?.forEach((activity) => {
      // Morning session
      sessions.push({
        resort_id: resortId,
        activity_id: activity.id,
        date: sessionDate,
        start_time: '09:00',
        end_time: format(addHours(new Date(`${sessionDate}T09:00`), activity.duration_minutes / 60), 'HH:mm'),
        capacity: activity.default_max_capacity,
        status: 'SCHEDULED',
      });
      
      // Afternoon session (skip for some activities)
      if (activity.category !== 'EXCURSION' || dayOffset % 2 === 0) {
        sessions.push({
          resort_id: resortId,
          activity_id: activity.id,
          date: sessionDate,
          start_time: '14:00',
          end_time: format(addHours(new Date(`${sessionDate}T14:00`), activity.duration_minutes / 60), 'HH:mm'),
          capacity: activity.default_max_capacity,
          status: 'SCHEDULED',
        });
      }
    });
  }

  const { data: createdSessions, error: sessionsError } = await supabase
    .from('activity_sessions')
    .insert(sessions)
    .select();

  if (sessionsError) {
    console.error('Error seeding sessions:', sessionsError);
    throw sessionsError;
  }

  // Create restaurants
  const { data: restaurants, error: restaurantsError } = await supabase
    .from('restaurants')
    .insert(DEMO_RESTAURANTS.map(r => ({ ...r, resort_id: resortId })))
    .select();

  if (restaurantsError) {
    console.error('Error seeding restaurants:', restaurantsError);
    throw restaurantsError;
  }

  // Create time slots for restaurants (next 10 days, dinner only)
  const slots: any[] = [];
  for (let dayOffset = 0; dayOffset <= 10; dayOffset++) {
    const slotDate = format(addDays(today, dayOffset), 'yyyy-MM-dd');
    
    restaurants?.forEach((restaurant) => {
      // 19:00 seating
      slots.push({
        resort_id: resortId,
        restaurant_id: restaurant.id,
        date: slotDate,
        start_time: '19:00',
        end_time: '20:30',
        meal_period: 'DINNER',
        capacity: Math.floor(restaurant.total_capacity / 2),
        status: 'OPEN',
      });
      // 20:30 seating
      slots.push({
        resort_id: resortId,
        restaurant_id: restaurant.id,
        date: slotDate,
        start_time: '20:30',
        end_time: '22:00',
        meal_period: 'DINNER',
        capacity: Math.floor(restaurant.total_capacity / 2),
        status: 'OPEN',
      });
    });
  }

  const { data: createdSlots, error: slotsError } = await supabase
    .from('restaurant_time_slots')
    .insert(slots)
    .select();

  if (slotsError) {
    console.error('Error seeding slots:', slotsError);
    throw slotsError;
  }

  // Create demo guests
  const guestData = DEMO_GUESTS.map(g => ({
    resort_id: resortId,
    full_name: g.full_name,
    room_number: g.room_number,
    nationality: g.nationality,
    check_in_date: format(addDays(today, g.daysFromNow), 'yyyy-MM-dd'),
    check_out_date: format(addDays(today, g.daysFromNow + g.stayLength), 'yyyy-MM-dd'),
    portal_enabled: true,
    portal_pin_hash: '1234', // Simple demo PIN
  }));

  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .insert(guestData)
    .select();

  if (guestsError) {
    console.error('Error seeding guests:', guestsError);
    throw guestsError;
  }

  // Create some activity bookings for realism with varied statuses
  const bookings: any[] = [];
  const confirmedGuests = guests?.slice(0, 5) || [];
  
  confirmedGuests.forEach((guest, guestIdx) => {
    const guestCheckIn = new Date(guest.check_in_date);
    const guestCheckOut = new Date(guest.check_out_date);
    
    // Separate past and future sessions
    const pastSessions = createdSessions?.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= guestCheckIn && sessionDate < today;
    }) || [];
    
    const futureSessions = createdSessions?.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= today && sessionDate <= guestCheckOut;
    }) || [];

    // Create past bookings with COMPLETED or CANCELLED status
    pastSessions.slice(0, 2).forEach((session, sIdx) => {
      const activity = activities?.find(a => a.id === session.activity_id);
      // First guest gets one cancelled past booking for demo
      const status = (guestIdx === 0 && sIdx === 0) ? 'CANCELLED' : 'COMPLETED';
      
      bookings.push({
        resort_id: resortId,
        guest_id: guest.id,
        session_id: session.id,
        room_number: guest.room_number,
        status,
        source: 'GUEST_PORTAL',
        num_adults: Math.floor(Math.random() * 2) + 1,
        num_children: Math.random() > 0.7 ? 1 : 0,
        price_per_person: activity?.default_price_per_person || 50,
        total_amount: (activity?.default_price_per_person || 50) * (Math.floor(Math.random() * 2) + 1),
      });
    });

    // Create future bookings with CONFIRMED or PENDING status
    futureSessions.slice(0, 2).forEach((session, sIdx) => {
      const activity = activities?.find(a => a.id === session.activity_id);
      // One pending booking for approval demo (second guest, first session)
      const status = (guestIdx === 1 && sIdx === 0) ? 'PENDING' : 'CONFIRMED';
      
      bookings.push({
        resort_id: resortId,
        guest_id: guest.id,
        session_id: session.id,
        room_number: guest.room_number,
        status,
        source: 'GUEST_PORTAL',
        num_adults: Math.floor(Math.random() * 2) + 1,
        num_children: Math.random() > 0.7 ? 1 : 0,
        price_per_person: activity?.default_price_per_person || 50,
        total_amount: (activity?.default_price_per_person || 50) * (Math.floor(Math.random() * 2) + 1),
      });
    });
  });

  if (bookings.length > 0) {
    const { error: bookingsError } = await supabase
      .from('activity_bookings')
      .insert(bookings);

    if (bookingsError) {
      console.error('Error seeding bookings:', bookingsError);
    }
  }

  // Create some restaurant reservations with varied statuses
  const reservations: any[] = [];
  confirmedGuests.forEach((guest, guestIdx) => {
    const guestCheckIn = new Date(guest.check_in_date);
    const guestCheckOut = new Date(guest.check_out_date);
    
    // Separate past and future slots
    const pastSlots = createdSlots?.filter(s => {
      const slotDate = new Date(s.date);
      return slotDate >= guestCheckIn && slotDate < today;
    }) || [];
    
    const futureSlots = createdSlots?.filter(s => {
      const slotDate = new Date(s.date);
      return slotDate >= today && slotDate <= guestCheckOut;
    }) || [];

    // Create past reservations with COMPLETED or CANCELLED status
    pastSlots.slice(0, 1).forEach((slot, sIdx) => {
      // First guest gets one cancelled past reservation for demo
      const status = (guestIdx === 0 && sIdx === 0) ? 'CANCELLED' : 'COMPLETED';
      
      reservations.push({
        resort_id: resortId,
        guest_id: guest.id,
        restaurant_slot_id: slot.id,
        room_number: guest.room_number,
        status,
        source: 'GUEST_PORTAL',
        num_adults: Math.floor(Math.random() * 2) + 1,
        num_children: Math.random() > 0.8 ? 1 : 0,
      });
    });

    // Create future reservations with CONFIRMED status
    futureSlots.slice(0, 1).forEach((slot) => {
      reservations.push({
        resort_id: resortId,
        guest_id: guest.id,
        restaurant_slot_id: slot.id,
        room_number: guest.room_number,
        status: 'CONFIRMED',
        source: 'GUEST_PORTAL',
        num_adults: Math.floor(Math.random() * 2) + 1,
        num_children: Math.random() > 0.8 ? 1 : 0,
      });
    });
  });

  if (reservations.length > 0) {
    const { error: reservationsError } = await supabase
      .from('restaurant_reservations')
      .insert(reservations);

    if (reservationsError) {
      console.error('Error seeding reservations:', reservationsError);
    }
  }

  // Create some stay feedback
  const pastGuests = guests?.filter(g => new Date(g.check_out_date) <= today) || [];
  const feedbackData = pastGuests.slice(0, 2).map(guest => ({
    resort_id: resortId,
    guest_id: guest.id,
    room_number: guest.room_number,
    check_in_date: guest.check_in_date,
    check_out_date: guest.check_out_date,
    overall_rating: Math.floor(Math.random() * 2) + 4, // 4-5 rating
    rating_activities: Math.floor(Math.random() * 2) + 4,
    rating_fnb: Math.floor(Math.random() * 2) + 4,
    rating_room: Math.floor(Math.random() * 2) + 4,
    rating_service: Math.floor(Math.random() * 2) + 4,
    would_recommend: 'YES' as const,
    highlight_comment: 'Great experience overall!',
    source: 'GUEST_PORTAL' as const,
  }));

  if (feedbackData.length > 0) {
    const { error: feedbackError } = await supabase
      .from('stay_feedback')
      .insert(feedbackData);

    if (feedbackError) {
      console.error('Error seeding feedback:', feedbackError);
    }
  }

  // Return seed summary
  const result: SeedResult = {
    activityBookings: bookings.length,
    restaurantReservations: reservations.length,
    guests: guests?.length ?? 0,
    sessions: createdSessions?.length ?? 0,
    slots: createdSlots?.length ?? 0,
  };

  console.log('[Demo Seed] Completed:', result);

  return result;
}