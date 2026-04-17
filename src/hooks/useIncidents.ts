import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  related_error_ids: string[];
  affected_resort_ids: string[];
  created_by: string;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
}

export interface CreateIncidentParams {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  relatedErrorIds?: string[];
  affectedResortIds?: string[];
  metadata?: Record<string, unknown>;
}

export function useIncidents(status?: IncidentStatus) {
  return useQuery({
    queryKey: ['incidents', status],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Incident[];
    },
  });
}

export function useIncident(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      if (!incidentId) throw new Error('Incident ID required');
      
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    enabled: !!incidentId,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      title,
      description,
      severity,
      relatedErrorIds = [],
      affectedResortIds = [],
      metadata = {}
    }: CreateIncidentParams) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          title,
          description,
          severity,
          related_error_ids: relatedErrorIds,
          affected_resort_ids: affectedResortIds,
          metadata_json: metadata as Json,
          created_by: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log to admin audit
      await supabase.from('admin_audit_logs').insert({
        actor_id: userId,
        action: 'incident_created',
        metadata_json: {
          incident_id: data.id,
          severity,
          affected_resorts: affectedResortIds.length,
          related_errors: relatedErrorIds.length
        }
      });
      
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident created');
    },
    onError: (error) => {
      toast.error(`Failed to create incident: ${error.message}`);
    }
  });
}

export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      incidentId,
      status,
      resolution
    }: {
      incidentId: string;
      status: IncidentStatus;
      resolution?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('Not authenticated');
      
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = userId;
      }
      
      const { data, error } = await supabase
        .from('incidents')
        .update(updateData as never)
        .eq('id', incidentId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log status change
      await supabase.from('admin_audit_logs').insert({
        actor_id: userId,
        action: 'incident_status_changed',
        metadata_json: {
          incident_id: incidentId,
          new_status: status,
          resolution
        }
      });
      
      return data as Incident;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      toast.success('Incident updated');
    }
  });
}
