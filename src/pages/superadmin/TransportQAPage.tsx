// Transport QA Panel for Super Admin debugging

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Car,
  Play,
  SkipForward,
  Users,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BuggyRequestStatus } from '@/types/database';

// Status progression order
const STATUS_ORDER: BuggyRequestStatus[] = [
  'requested',
  'queued',
  'assigned_to_trip',
  'driver_en_route',
  'arrived',
  'picked_up',
  'completed',
];

interface GuestRow {
  id: string;
  first_name: string;
  last_name: string;
  room_number: string;
}

interface StopRow {
  id: string;
  name: string;
  zone: string | null;
}

interface BuggyRow {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

interface DriverRow {
  id: string;
  user_id: string;
  status: string;
}

interface RequestRow {
  id: string;
  status: string;
  party_size: number;
  priority: string;
  request_type: string;
  created_at: string;
  eta_minutes: number | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_room: string | null;
  pickup_name: string | null;
  dropoff_name: string | null;
}

export default function TransportQAPage() {
  const navigate = useNavigate();
  const { currentResort, resorts } = useResort();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedResortId, setSelectedResortId] = useState(currentResort?.id || '');
  const [selectedGuestId, setSelectedGuestId] = useState('');

  // Require super admin
  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  // Fetch in-house guests for selected resort
  const { data: guests = [] } = useQuery({
    queryKey: ['qa-guests', selectedResortId],
    queryFn: async (): Promise<GuestRow[]> => {
      if (!selectedResortId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('guests')
        .select('id, first_name, last_name, room_number')
        .eq('resort_id', selectedResortId)
        .lte('check_in_date', today)
        .gte('check_out_date', today)
        .order('room_number');
      if (error) throw error;
      return (data as unknown as GuestRow[]) || [];
    },
    enabled: !!selectedResortId,
  });

  // Fetch stops for selected resort
  const { data: stops = [] } = useQuery({
    queryKey: ['qa-stops', selectedResortId],
    queryFn: async (): Promise<StopRow[]> => {
      if (!selectedResortId) return [];
      const { data, error } = await supabase
        .from('buggy_stops')
        .select('id, name, zone')
        .eq('resort_id', selectedResortId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data as unknown as StopRow[]) || [];
    },
    enabled: !!selectedResortId,
  });

  // Fetch buggies for selected resort
  const { data: buggies = [] } = useQuery({
    queryKey: ['qa-buggies', selectedResortId],
    queryFn: async (): Promise<BuggyRow[]> => {
      if (!selectedResortId) return [];
      const { data, error } = await supabase
        .from('buggies')
        .select('id, name, capacity, status')
        .eq('resort_id', selectedResortId)
        .order('name');
      if (error) throw error;
      return (data as unknown as BuggyRow[]) || [];
    },
    enabled: !!selectedResortId,
  });

  // Fetch drivers for selected resort
  const { data: drivers = [] } = useQuery({
    queryKey: ['qa-drivers', selectedResortId],
    queryFn: async (): Promise<DriverRow[]> => {
      if (!selectedResortId) return [];
      const { data, error } = await supabase
        .from('buggy_drivers')
        .select('id, user_id, status')
        .eq('resort_id', selectedResortId)
        .order('status');
      if (error) throw error;
      return (data as unknown as DriverRow[]) || [];
    },
    enabled: !!selectedResortId,
  });

  // Fetch active requests for selected resort (using separate queries to avoid join issues)
  const { data: requests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['qa-requests', selectedResortId],
    queryFn: async (): Promise<RequestRow[]> => {
      if (!selectedResortId) return [];
      
      // Fetch requests first
      const { data: requestsData, error } = await supabase
        .from('buggy_requests')
        .select('id, status, party_size, priority, request_type, created_at, eta_minutes, guest_id, pickup_stop_id, dropoff_stop_id')
        .eq('resort_id', selectedResortId)
        .not('status', 'in', '(completed,cancelled,failed)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      if (!requestsData?.length) return [];
      
      // Get all unique guest IDs and stop IDs
      const guestIds = [...new Set(requestsData.filter(r => r.guest_id).map(r => r.guest_id))] as string[];
      const stopIds = [...new Set([
        ...requestsData.filter(r => r.pickup_stop_id).map(r => r.pickup_stop_id),
        ...requestsData.filter(r => r.dropoff_stop_id).map(r => r.dropoff_stop_id)
      ])] as string[];
      
      // Fetch guests
      const { data: guestsData } = guestIds.length > 0 
        ? await supabase.from('guests').select('id, first_name, last_name, room_number').in('id', guestIds)
        : { data: [] };
      
      // Fetch stops
      const { data: stopsData } = stopIds.length > 0
        ? await supabase.from('buggy_stops').select('id, name').in('id', stopIds)
        : { data: [] };
      
      const guestMap = new Map((guestsData || []).map(g => [g.id, g]));
      const stopMap = new Map((stopsData || []).map(s => [s.id, s]));
      
      return requestsData.map(r => {
        const guest = r.guest_id ? guestMap.get(r.guest_id) : null;
        const pickup = r.pickup_stop_id ? stopMap.get(r.pickup_stop_id) : null;
        const dropoff = r.dropoff_stop_id ? stopMap.get(r.dropoff_stop_id) : null;
        
        return {
          id: r.id,
          status: r.status,
          party_size: r.party_size,
          priority: r.priority,
          request_type: r.request_type,
          created_at: r.created_at,
          eta_minutes: r.eta_minutes,
          guest_first_name: guest?.first_name || null,
          guest_last_name: guest?.last_name || null,
          guest_room: guest?.room_number || null,
          pickup_name: pickup?.name || null,
          dropoff_name: dropoff?.name || null,
        };
      });
    },
    enabled: !!selectedResortId,
  });

  // Create sample request mutation
  const createRequest = useMutation({
    mutationFn: async () => {
      if (!selectedResortId || !selectedGuestId || stops.length < 2) {
        throw new Error('Missing required data');
      }
      
      const pickupStop = stops[0];
      const dropoffStop = stops[Math.min(1, stops.length - 1)];
      
      const { data, error } = await supabase.rpc('create_buggy_request_idempotent', {
        _resort_id: selectedResortId,
        _guest_id: selectedGuestId,
        _request_type: 'on_demand',
        _request_source: 'staff',
        _pickup_stop_id: pickupStop.id,
        _dropoff_stop_id: dropoffStop.id,
        _party_size: 2,
        _needs_accessible: false,
        _idempotency_key: `qa-test-${Date.now()}`,
      });
      
      if (error) throw error;
      return data as { request_id?: string } | null;
    },
    onSuccess: (data) => {
      const requestId = data?.request_id;
      toast.success('Sample request created', { description: requestId ? `ID: ${requestId.slice(0, 8)}...` : undefined });
      refetchRequests();
    },
    onError: (error: Error) => {
      toast.error('Failed to create request', { description: error.message });
    },
  });

  // Assign request to trip mutation
  const assignRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!selectedResortId || buggies.length === 0 || drivers.length === 0) {
        throw new Error('No buggies or drivers available');
      }
      
      // First create a trip from the request
      const { data: tripData, error: tripError } = await supabase.rpc('create_trip_from_requests', {
        _resort_id: selectedResortId,
        _request_ids: [requestId],
        _trip_type: 'pooled_custom',
      });
      
      if (tripError) throw tripError;
      
      const tripResult = tripData as { trip_id?: string } | null;
      const tripId = tripResult?.trip_id;
      if (!tripId) throw new Error('Failed to create trip');
      
      // Then assign buggy and driver
      const availableBuggy = buggies.find(b => b.status === 'available') || buggies[0];
      const onlineDriver = drivers.find(d => d.status === 'online') || drivers[0];
      
      const { error: assignError } = await supabase.rpc('assign_trip_atomic', {
        _trip_id: tripId,
        _buggy_id: availableBuggy.id,
        _driver_user_id: onlineDriver.user_id,
      });
      
      if (assignError) throw assignError;
      
      return { tripId };
    },
    onSuccess: () => {
      toast.success('Request assigned to trip with driver');
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['qa-buggies', selectedResortId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to assign', { description: error.message });
    },
  });

  // Advance status mutation - use direct update for QA purposes
  const advanceStatus = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');
      
      const currentIndex = STATUS_ORDER.indexOf(request.status as BuggyRequestStatus);
      if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
        throw new Error('Cannot advance status');
      }
      
      const nextStatus = STATUS_ORDER[currentIndex + 1];
      
      // Direct update for QA testing purposes
      const updateData: { status: BuggyRequestStatus; eta_minutes?: number } = { status: nextStatus };
      if (nextStatus === 'driver_en_route') {
        updateData.eta_minutes = 5;
      }
      
      const { error } = await supabase
        .from('buggy_requests')
        .update(updateData)
        .eq('id', requestId);
      
      if (error) throw error;
      return { newStatus: nextStatus };
    },
    onSuccess: (data) => {
      toast.success(`Status advanced to: ${data.newStatus}`);
      refetchRequests();
    },
    onError: (error: Error) => {
      toast.error('Failed to advance status', { description: error.message });
    },
  });

  // Cancel request mutation
  const cancelRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('cancel_buggy_request', {
        _request_id: requestId,
        _reason: 'Cancelled via QA panel',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Request cancelled');
      refetchRequests();
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel', { description: error.message });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-orange-500';
      case 'queued': return 'bg-yellow-500';
      case 'assigned_to_trip': return 'bg-blue-500';
      case 'driver_en_route': return 'bg-purple-500';
      case 'arrived': return 'bg-green-500';
      case 'picked_up': return 'bg-teal-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin/tools')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            Transport QA Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Test and debug transport module flows
          </p>
        </div>
      </div>

      {/* Resort Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Resort</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedResortId} onValueChange={setSelectedResortId}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Choose a resort..." />
            </SelectTrigger>
            <SelectContent>
              {resorts.map(resort => (
                <SelectItem key={resort.id} value={resort.id}>
                  {resort.name} {resort.code && `(${resort.code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedResortId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Request Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Sample Request
              </CardTitle>
              <CardDescription>
                Create a test request for a guest using the RPCs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Guest</Label>
                <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a guest..." />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map(guest => (
                      <SelectItem key={guest.id} value={guest.id}>
                        Room {guest.room_number} - {guest.first_name} {guest.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {stops.length} stops available
              </div>

              <Button 
                className="w-full" 
                onClick={() => createRequest.mutate()}
                disabled={!selectedGuestId || stops.length < 2 || createRequest.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Create On-Demand Request
              </Button>
            </CardContent>
          </Card>

          {/* Infrastructure Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Infrastructure Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">{stops.length}</div>
                  <div className="text-sm text-muted-foreground">Stops</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">{buggies.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Buggies ({buggies.filter(b => b.status === 'available').length} available)
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">{drivers.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Drivers ({drivers.filter(d => d.status === 'online').length} online)
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">{requests.length}</div>
                  <div className="text-sm text-muted-foreground">Active Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Requests */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Active Requests
                </CardTitle>
                <CardDescription>
                  Manage and advance request statuses
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchRequests()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Car className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No active requests</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a sample request above</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {requests.map(request => {
                      const canAdvance = STATUS_ORDER.indexOf(request.status as BuggyRequestStatus) < STATUS_ORDER.length - 1;
                      const needsAssignment = request.status === 'requested' || request.status === 'queued';
                      
                      return (
                        <div 
                          key={request.id} 
                          className="p-4 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${getStatusColor(request.status)} text-white`}>
                                  {request.status}
                                </Badge>
                                <Badge variant="outline">{request.request_type}</Badge>
                                {request.priority === 'high' && (
                                  <Badge variant="destructive">HIGH</Badge>
                                )}
                              </div>
                              
                              <p className="font-medium">
                                {request.guest_first_name} {request.guest_last_name} (Room {request.guest_room})
                              </p>
                              
                              <p className="text-sm text-muted-foreground mt-1">
                                {request.pickup_name || 'Unknown'} → {request.dropoff_name || 'Unknown'}
                              </p>
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {request.party_size} pax
                                </span>
                                {request.eta_minutes && (
                                  <span>ETA: {request.eta_minutes} min</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {needsAssignment && (
                                <Button 
                                  size="sm" 
                                  onClick={() => assignRequest.mutate(request.id)}
                                  disabled={assignRequest.isPending || buggies.length === 0 || drivers.length === 0}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                              )}
                              
                              {canAdvance && !needsAssignment && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => advanceStatus.mutate(request.id)}
                                  disabled={advanceStatus.isPending}
                                >
                                  <SkipForward className="h-4 w-4 mr-1" />
                                  Advance
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => cancelRequest.mutate(request.id)}
                                disabled={cancelRequest.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Status Flow Guide */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Status Flow Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_ORDER.map((status, index) => (
                  <div key={status} className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(status)} text-white`}>
                      {status}
                    </Badge>
                    {index < STATUS_ORDER.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                <strong>Assign:</strong> Creates a trip, assigns buggy + driver, moves to <code>assigned_to_trip</code><br />
                <strong>Advance:</strong> Steps through the status flow using driver RPCs
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
