import { Outlet } from 'react-router-dom';

/**
 * Lightweight sub-layout that wraps department routes inside StaffShell.
 * DepartmentProvider and sidebar/nav swapping are handled at the StaffShell level
 * based on URL pattern detection (/staff/dept/:deptKey).
 */
export function DepartmentLayout() {
  return <Outlet />;
}

export default DepartmentLayout;
