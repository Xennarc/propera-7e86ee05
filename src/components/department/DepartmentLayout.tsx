import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDepartmentShell } from '@/contexts/DepartmentShellContext';

/**
 * Lightweight sub-layout that wraps department routes inside StaffShell.
 * Signals StaffShell to swap sidebar/nav to department variants.
 * DepartmentProvider is applied at the StaffShell level (not here)
 * so that sidebar/topbar/bottom-nav also have access to department context.
 */
export function DepartmentLayout() {
  const { setDeptActive } = useDepartmentShell();

  useEffect(() => {
    setDeptActive(true);
    return () => setDeptActive(false);
  }, [setDeptActive]);

  return <Outlet />;
}

export default DepartmentLayout;
