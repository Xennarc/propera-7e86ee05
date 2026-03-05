-- Enable realtime for activity_bookings and activity_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_sessions;