import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BuggyTripType } from '@/types/database';

export function useTransportMutations(resortId: string | undefined) {
  const queryClient = useQueryClient();
  
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transport-queue', resortId] });
    queryClient.invalidateQueries({ queryKey: ['transport-trips', resortId] });
    queryClient.invalidateQueries({ queryKey: ['buggies', resortId] });
    queryClient.invalidateQueries({ queryKey: ['buggy-drivers', resortId] });
  };
  
  const createTripFromRequests = useMutation({
    mutationFn: async ({
      requestIds,
      tripType = 'pooled_custom' as BuggyTripType,
    }: {
      requestIds: string[];
      tripType?: BuggyTripType;
    }) => {
      const { data, error } = await supabase.rpc('create_trip_from_requests', {
        _resort_id: resortId,
        _request_ids: requestIds,
        _trip_type: tripType,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Trip created successfully');
      invalidateAll();
    },
    onError: (error: any) => {
      console.error('Create trip error:', error);
      toast.error(error.message || 'Failed to create trip');
    },
  });
  
  const addRequestToTrip = useMutation({
    mutationFn: async ({
      tripId,
      requestId,
    }: {
      tripId: string;
      requestId: string;
    }) => {
      const { data, error } = await supabase.rpc('add_request_to_trip', {
        _trip_id: tripId,
        _request_id: requestId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Request added to trip');
      invalidateAll();
    },
    onError: (error: any) => {
      console.error('Add request error:', error);
      toast.error(error.message || 'Failed to add request');
    },
  });
  
  const removeRequestFromTrip = useMutation({
    mutationFn: async ({
      tripId,
      requestId,
      reason = 'Removed by staff',
    }: {
      tripId: string;
      requestId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('remove_request_from_trip', {
        _trip_id: tripId,
        _request_id: requestId,
        _reason: reason,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Request removed from trip');
      invalidateAll();
    },
    onError: (error: any) => {
      console.error('Remove request error:', error);
      toast.error(error.message || 'Failed to remove request');
    },
  });
  
  const assignTrip = useMutation({
    mutationFn: async ({
      tripId,
      buggyId,
      driverUserId,
    }: {
      tripId: string;
      buggyId: string;
      driverUserId: string;
    }) => {
      const { data, error } = await supabase.rpc('assign_trip_atomic', {
        _trip_id: tripId,
        _buggy_id: buggyId,
        _driver_user_id: driverUserId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Trip assigned successfully');
      invalidateAll();
    },
    onError: (error: any) => {
      console.error('Assign trip error:', error);
      toast.error(error.message || 'Failed to assign trip');
    },
  });
  
  const reorderTripStops = useMutation({
    mutationFn: async ({
      tripId,
      orderedStopIds,
    }: {
      tripId: string;
      orderedStopIds: string[];
    }) => {
      const { data, error } = await supabase.rpc('reorder_trip_stops', {
        _trip_id: tripId,
        _ordered_stop_ids: orderedStopIds,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { tripId }) => {
      toast.success('Stops reordered');
      queryClient.invalidateQueries({ queryKey: ['trip-stops', tripId] });
    },
    onError: (error: any) => {
      console.error('Reorder stops error:', error);
      toast.error(error.message || 'Failed to reorder stops');
    },
  });
  
  const cancelRequest = useMutation({
    mutationFn: async ({
      requestId,
      reason = 'Cancelled by staff',
    }: {
      requestId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('cancel_buggy_request', {
        _request_id: requestId,
        _reason: reason,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Request cancelled');
      invalidateAll();
    },
    onError: (error: any) => {
      console.error('Cancel request error:', error);
      toast.error(error.message || 'Failed to cancel request');
    },
  });
  
  const registerDriver = useMutation({
    mutationFn: async ({
      userId,
      fullName,
    }: {
      userId: string;
      fullName: string;
    }) => {
      const { error } = await supabase
        .from('buggy_drivers')
        .insert({
          resort_id: resortId,
          user_id: userId,
          status: 'offline',
        });
      
      if (error) throw error;
      return { fullName };
    },
    onSuccess: (data) => {
      toast.success(`${data.fullName} registered as driver`);
      queryClient.invalidateQueries({ queryKey: ['buggy-drivers', resortId] });
      queryClient.invalidateQueries({ queryKey: ['eligible-drivers', resortId] });
    },
    onError: (error: any) => {
      console.error('Register driver error:', error);
      toast.error(error.message || 'Failed to register driver');
    },
  });
  
  return {
    createTripFromRequests,
    addRequestToTrip,
    removeRequestFromTrip,
    assignTrip,
    reorderTripStops,
    cancelRequest,
    registerDriver,
    isLoading:
      createTripFromRequests.isPending ||
      addRequestToTrip.isPending ||
      removeRequestFromTrip.isPending ||
      assignTrip.isPending ||
      reorderTripStops.isPending ||
      cancelRequest.isPending ||
      registerDriver.isPending,
  };
}
