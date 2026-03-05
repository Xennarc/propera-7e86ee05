import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DepartmentProvider } from '@/contexts/DepartmentContext';
import { useDepartmentShell } from '@/contexts/DepartmentShellContext';

/**
 * Lightweight sub-layout that wraps department routes inside StaffShell.
 * Provides DepartmentProvider and signals StaffShell to swap sidebar/nav.
 */
function DepartmentLayoutInner() {
  const { setDeptActive } = useDepartmentShell();

  useEffect(() => {
    setDeptActive(true);
    return () => setDeptActive(false);
  }, [setDeptActive]);

  return <Outlet />;
}

export function DepartmentLayout() {
  return (
    <DepartmentProvider>
      <DepartmentLayoutInner />
    </DepartmentProvider>
  );
}

export default DepartmentLayout;
