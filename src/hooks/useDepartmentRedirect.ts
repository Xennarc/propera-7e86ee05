/**
 * Hook to detect department-only users and provide redirect target.
 * Used by StaffShell to redirect users who have department memberships
 * but no broader staff portal access.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeptRedirectResult {
  /** Whether this user should be redirected to dept portal */
  shouldRedirect: boolean;
  /** Target path for redirect */
  redirectPath: string | null;
  /** Loading state */
  loading: boolean;
}

export function useDepartmentRedirect(): DeptRedirectResult {
  const { user, memberships, loading: authLoading, userDataLoading } = useAuth();
  const [deptKey, setDeptKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || authLoading || userDataLoading) return;

    // If user already has resort memberships, no redirect needed
    if (memberships.length > 0) {
      setChecked(true);
      return;
    }

    // Check for department memberships
    let cancelled = false;
    async function check() {
      const { data } = await supabase
        .from('department_memberships')
        .select('department_key, department_id, resort_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .limit(1);

      if (cancelled) return;

      if (data && data.length > 0) {
        const membership = data[0];
        // Try to resolve dept key from department_id if available
        if (membership.department_id) {
          const { data: dept } = await supabase
            .from('resort_departments')
            .select('key')
            .eq('id', membership.department_id)
            .single();
          if (!cancelled && dept) {
            setDeptKey(dept.key);
          }
        } else if (membership.department_key) {
          setDeptKey(membership.department_key);
        }
      }
      if (!cancelled) setChecked(true);
    }

    check();
    return () => { cancelled = true; };
  }, [user?.id, memberships.length, authLoading, userDataLoading]);

  const shouldRedirect = checked && memberships.length === 0 && deptKey !== null;

  return {
    shouldRedirect,
    redirectPath: deptKey ? `/dept/${deptKey}/planner` : null,
    loading: !checked && !!user && !authLoading && !userDataLoading,
  };
}
