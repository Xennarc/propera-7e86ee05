import { useParams, useLocation, Link } from 'react-router-dom';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSidebarGroups, type ModuleRegistryEntry } from '@/lib/departments/module-registry';
import type { DepartmentModuleKey } from '@/types/database';

interface DepartmentSidebarProps {
  onNavigate?: () => void;
}

export function DepartmentSidebar({ onNavigate }: DepartmentSidebarProps) {
  const { deptKey } = useParams<{ deptKey: string }>();
  const location = useLocation();
  const { currentDepartment, myMemberships, departments, hasModule, isManager } = useDepartment();
  const { signOut, profile } = useAuth();

  const baseUrl = `/staff/dept/${deptKey}`;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const isModuleVisible = (entry: ModuleRegistryEntry): boolean => {
    if (entry.requiresManager && !isManager) return false;
    if (entry.isToggleable) return hasModule(entry.key as DepartmentModuleKey);
    return true;
  };

  // Group resources under a single section — check if any resource is visible
  const sidebarGroups = getSidebarGroups();

  // Departments the user can switch to
  const switchableDepts = departments.filter(d =>
    myMemberships.some(m => m.department_id === d.id)
  );

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
                    to={`/staff/dept/${dept.key}/planner`}
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

      {/* Registry-driven nav */}
      <nav className="flex-1 p-3 space-y-1">
        {sidebarGroups.map((group, gi) => {
          const visibleModules = group.modules.filter(isModuleVisible);
          if (visibleModules.length === 0) return null;

          // Operations group renders flat (no section header for first group)
          const showHeader = gi > 0;

          return (
            <div key={group.key} className={cn(showHeader && 'pt-4')}>
              {showHeader && (
                <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {visibleModules.map(entry => {
                const url = `${baseUrl}/${entry.routeSegment}`;
                const Icon = entry.icon;
                return (
                  <Link
                    key={entry.key}
                    to={url}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                      isActive(url)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {entry.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
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
