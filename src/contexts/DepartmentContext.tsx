import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureEnabled } from '@/components/FeatureGate';
import type { ResortDepartment, DepartmentMembership, DepartmentModuleAccess, DepartmentModuleKey, DepartmentBinding } from '@/types/database';
import { resolveDepartmentScope, type DepartmentScope } from '@/lib/departments/department-scope';

interface DepartmentContextType {
  /** All departments for the user's resort(s) */
  departments: ResortDepartment[];
  /** All department memberships for current user */
  myMemberships: DepartmentMembership[];
  /** Current department based on route :deptKey */
  currentDepartment: ResortDepartment | null;
  /** Current membership for the active department */
  currentMembership: DepartmentMembership | null;
  /** Module access entries for the current department */
  moduleAccess: DepartmentModuleAccess[];
  /** Bindings for the current department (scope source of truth) */
  bindings: DepartmentBinding[];
  /** Resolved scope from canonical resolver */
  scope: DepartmentScope;
  /** Whether the user has access to a specific module in current dept */
  hasModule: (moduleKey: DepartmentModuleKey) => boolean;
  /** Whether the user is a manager in the current department */
  isManager: boolean;
  /** Whether user has ONLY department access (no broader staff roles) */
  isDeptOnly: boolean;
  /** Loading state */
  loading: boolean;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children, deptKeyOverride }: { children: ReactNode; deptKeyOverride?: string }) {
  const { user, memberships, isSuperAdmin } = useAuth();
  const params = useParams<{ deptKey: string }>();
  const deptKey = deptKeyOverride ?? params.deptKey;
  const v2Enabled = useFeatureEnabled('dept_scope_v2_enabled');

  const [departments, setDepartments] = useState<ResortDepartment[]>([]);
  const [myMemberships, setMyMemberships] = useState<DepartmentMembership[]>([]);
  const [moduleAccess, setModuleAccess] = useState<DepartmentModuleAccess[]>([]);
  const [bindings, setBindings] = useState<DepartmentBinding[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch departments and memberships for this user
  useEffect(() => {
    if (!user) {
      setDepartments([]);
      setMyMemberships([]);
      setModuleAccess([]);
      setBindings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchDeptData() {
      setLoading(true);
      try {
        // Fetch all department memberships for this user
        const { data: memberData } = await supabase
          .from('department_memberships')
          .select('*')
          .eq('user_id', user!.id)
          .eq('is_active', true);

        if (cancelled) return;
        const mems = (memberData ?? []) as DepartmentMembership[];
        setMyMemberships(mems);

        // Get unique resort IDs from memberships
        const resortIds = [...new Set(mems.map(m => m.resort_id))];
        
        if (resortIds.length > 0) {
          // Fetch departments for those resorts
          const { data: deptData } = await supabase
            .from('resort_departments')
            .select('*')
            .in('resort_id', resortIds)
            .eq('is_active', true);

          if (cancelled) return;
          setDepartments((deptData ?? []) as ResortDepartment[]);
        } else {
          setDepartments([]);
        }

        // Fetch module access and bindings in parallel
        const [accessResult, bindingsResult] = await Promise.all([
          supabase.from('department_module_access').select('*').eq('user_id', user!.id),
          resortIds.length > 0
            ? supabase.from('department_bindings').select('*').in('resort_id', resortIds).eq('is_active', true)
            : Promise.resolve({ data: [] }),
        ]);

        if (cancelled) return;
        setModuleAccess((accessResult.data ?? []) as DepartmentModuleAccess[]);
        setBindings((bindingsResult.data ?? []) as DepartmentBinding[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDeptData();
    return () => { cancelled = true; };
  }, [user?.id]);

  const currentDepartment = useMemo(() => {
    if (!deptKey) return null;
    return departments.find(d => d.key === deptKey) ?? null;
  }, [departments, deptKey]);

  const currentMembership = useMemo(() => {
    if (!currentDepartment) return null;
    return myMemberships.find(m => m.department_id === currentDepartment.id) ?? null;
  }, [myMemberships, currentDepartment]);

  const currentModuleAccess = useMemo(() => {
    if (!currentDepartment) return [];
    return moduleAccess.filter(a => a.department_id === currentDepartment.id);
  }, [moduleAccess, currentDepartment]);

  const currentBindings = useMemo(() => {
    if (!currentDepartment) return [];
    return bindings.filter(b => b.department_id === currentDepartment.id);
  }, [bindings, currentDepartment]);

  const scope = useMemo(() => resolveDepartmentScope({
    department: currentDepartment,
    bindings: currentBindings,
    v2Enabled,
  }), [currentDepartment, currentBindings, v2Enabled]);

  const isManager = useMemo(() => {
    if (isSuperAdmin()) return true;
    if (!currentMembership) return false;
    return currentMembership.dept_role === 'manager' || currentMembership.dept_role === 'MANAGER';
  }, [currentMembership, isSuperAdmin]);

  const hasModule = (moduleKey: DepartmentModuleKey): boolean => {
    if (isSuperAdmin()) return true;
    // Resort admins also have full access
    if (currentDepartment) {
      const resortMembership = memberships.find(m => m.resort_id === currentDepartment.resort_id);
      if (resortMembership?.resort_role === 'RESORT_ADMIN') return true;
    }
    // Department managers have all modules by default
    if (isManager) return true;
    return currentModuleAccess.some(a => a.module_key === moduleKey && a.enabled);
  };

  // User is department-only if they have dept memberships but no resort memberships
  const isDeptOnly = useMemo(() => {
    if (isSuperAdmin()) return false;
    return memberships.length === 0 && myMemberships.length > 0;
  }, [memberships, myMemberships, isSuperAdmin]);

  return (
    <DepartmentContext.Provider
      value={{
        departments,
        myMemberships,
        currentDepartment,
        currentMembership,
        moduleAccess: currentModuleAccess,
        bindings: currentBindings,
        scope,
        hasModule,
        isManager,
        isDeptOnly,
        loading,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
}
