import { useAuth } from '@/contexts/AuthContext';
import StaffHomeRouter from './dashboards/StaffHomeRouter';
import { TodayHub } from '@/components/staff/TodayHub';

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
  
  // Super admins see the role-based dashboard, others see TodayHub
  if (isSuperAdmin()) {
    return <StaffHomeRouter />;
  }
  
  return <TodayHub />;
}
