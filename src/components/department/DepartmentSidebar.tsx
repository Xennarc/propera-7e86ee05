import { useParams, useLocation, Link } from 'react-router-dom';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CalendarDays, LayoutList, Inbox, Wrench, ChevronDown, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DepartmentModuleKey } from '@/types/database';

interface DepartmentSidebarProps {
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  moduleKey: DepartmentModuleKey;
}

export function DepartmentSidebar({ onNavigate }: DepartmentSidebarProps) {
  const { deptKey } = useParams<{ deptKey: string }>();
  const location = useLocation();
  const { currentDepartment, myMemberships, departments, hasModule, isManager } = useDepartment();
  const { signOut, profile } = useAuth();

  const baseUrl = `/dept/${deptKey}`;

  const primaryNav: NavItem[] = [
    { title: 'Planner', url: `${baseUrl}/planner`, icon: CalendarDays, moduleKey: 'ops_planner' },
    { title: 'Master Sheet', url: `${baseUrl}/master`, icon: LayoutList, moduleKey: 'master_ops_sheet' },
    { title: 'Inbox', url: `${baseUrl}/inbox`, icon: Inbox, moduleKey: 'ops_inbox' },
  ];

  // Resources sub-items — only show if user has at least one resources_* module
  const hasAnyResource = hasModule('resources_assets') || hasModule('resources_shifts') || hasModule('resources_unavailability');

  const resourceNav: NavItem[] = [
    { title: 'Assets', url: `${baseUrl}/resources/assets`, icon: Wrench, moduleKey: 'resources_assets' },
    { title: 'Shifts', url: `${baseUrl}/resources/shifts`, icon: Wrench, moduleKey: 'resources_shifts' },
    { title: 'Unavailability', url: `${baseUrl}/resources/unavailability`, icon: Wrench, moduleKey: 'resources_unavailability' },
  ];

  // Departments the user can switch to
  const switchableDepts = departments.filter(d =>
    myMemberships.some(m => m.department_id === d.id)
  );

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex flex-col h-full">
      {/* Dept switcher header */}
      <div className="p-4 border-b border-border/30">
        {switchableDepts.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-left h-auto py-2">
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Department</div>
                  <div className="font-semibold text-sm mt-0.5">{currentDepartment?.name ?? deptKey}</div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {switchableDepts.map(dept => (
                <DropdownMenuItem key={dept.id} asChild>
                  <Link
                    to={`/dept/${dept.key}/planner`}
                    onClick={onNavigate}
                    className={cn(dept.key === deptKey && 'font-semibold')}
                  >
                    {dept.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="px-2">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Department</div>
            <div className="font-semibold text-sm mt-0.5">{currentDepartment?.name ?? deptKey}</div>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex-1 p-3 space-y-1">
        {primaryNav.filter(item => hasModule(item.moduleKey)).map(item => (
          <Link
            key={item.url}
            to={item.url}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              isActive(item.url)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {item.title}
          </Link>
        ))}

        {/* Resources section */}
        {hasAnyResource && (
          <div className="pt-4">
            <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resources</div>
            {resourceNav.filter(item => hasModule(item.moduleKey)).map(item => (
              <Link
                key={item.url}
                to={item.url}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  isActive(item.url)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.title}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/30">
        <div className="px-3 py-1 text-xs text-muted-foreground truncate mb-2">
          {profile?.full_name ?? 'Staff'}
          {isManager && <span className="ml-1 text-primary">(Manager)</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
