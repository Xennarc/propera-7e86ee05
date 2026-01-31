-- Create a trigger function to auto-generate guest notifications on buggy request status changes
CREATE OR REPLACE FUNCTION public.notify_guest_transport_status()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
  v_link_url text;
  v_pickup_name text;
  v_dropoff_name text;
BEGIN
  -- Only proceed if guest_id exists and status actually changed
  IF NEW.guest_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get stop names for better messages
  SELECT name INTO v_pickup_name FROM public.buggy_stops WHERE id = NEW.pickup_stop_id;
  SELECT name INTO v_dropoff_name FROM public.buggy_stops WHERE id = NEW.dropoff_stop_id;
  
  -- Use text fallbacks if no stop selected
  v_pickup_name := COALESCE(v_pickup_name, NEW.pickup_text, 'your location');
  v_dropoff_name := COALESCE(v_dropoff_name, NEW.dropoff_text, 'your destination');
  
  v_link_url := '/guest/my-rides';

  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'assigned_to_trip' THEN
      v_type := 'TRANSPORT_DRIVER_ASSIGNED';
      v_title := 'Driver Assigned';
      v_message := 'A driver has been assigned to pick you up from ' || v_pickup_name || '.';
    WHEN 'driver_en_route' THEN
      v_type := 'TRANSPORT_EN_ROUTE';
      v_title := 'Buggy En Route';
      IF NEW.eta_minutes IS NOT NULL THEN
        v_message := 'Your buggy is on the way! ETA: ' || NEW.eta_minutes || ' minutes.';
      ELSE
        v_message := 'Your buggy is on the way to ' || v_pickup_name || '.';
      END IF;
    WHEN 'arrived' THEN
      v_type := 'TRANSPORT_ARRIVED';
      v_title := 'Buggy Arrived';
      v_message := 'Your buggy has arrived at ' || v_pickup_name || '. Please proceed to the pickup point.';
    WHEN 'picked_up' THEN
      -- No notification for picked_up, guest is already in the buggy
      RETURN NEW;
    WHEN 'completed' THEN
      v_type := 'TRANSPORT_COMPLETED';
      v_title := 'Trip Completed';
      v_message := 'You have arrived at ' || v_dropoff_name || '. Thank you for riding with us!';
    WHEN 'cancelled' THEN
      v_type := 'TRANSPORT_CANCELLED';
      v_title := 'Ride Cancelled';
      v_message := COALESCE(NEW.status_reason, 'Your buggy request has been cancelled.');
    WHEN 'failed' THEN
      v_type := 'TRANSPORT_CANCELLED';
      v_title := 'Could Not Assign Buggy';
      v_message := COALESCE(NEW.status_reason, 'We were unable to assign a buggy to your request. Please try again or contact the front desk.');
    ELSE
      -- No notification for other statuses (requested, queued, etc.)
      RETURN NEW;
  END CASE;

  -- Insert the notification
  INSERT INTO public.notifications (
    resort_id,
    guest_id,
    audience,
    type,
    title,
    message,
    link_url,
    channel
  ) VALUES (
    NEW.resort_id,
    NEW.guest_id,
    'GUEST',
    v_type,
    v_title,
    v_message,
    v_link_url,
    'IN_APP'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_guest_transport_status ON public.buggy_requests;

CREATE TRIGGER trg_notify_guest_transport_status
  AFTER UPDATE OF status ON public.buggy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_guest_transport_status();