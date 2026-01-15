import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityAuditIssue {
  issue_type: string;
  severity: string;
  schema_name: string;
  table_name: string;
  details: string;
  recommended_fix: string;
}

export interface SecurityAuditSummary {
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  by_type: Record<string, number>;
  last_checked: string;
}

export function useSecurityAudit() {
  return useQuery({
    queryKey: ['security-audit-results'],
    queryFn: async (): Promise<SecurityAuditIssue[]> => {
      const { data, error } = await supabase.rpc('get_security_audit_results');
      if (error) throw error;
      return (data as SecurityAuditIssue[]) || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useSecurityAuditSummary() {
  return useQuery({
    queryKey: ['security-audit-summary'],
    queryFn: async (): Promise<SecurityAuditSummary | null> => {
      const { data, error } = await supabase.rpc('get_security_audit_summary');
      if (error) throw error;
      return data as unknown as SecurityAuditSummary | null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
