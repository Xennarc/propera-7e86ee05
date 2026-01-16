import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { StaffBreadcrumbs } from '@/components/layout/StaffBreadcrumbs';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import {
  Menu,
  Search,
  HelpCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffTopbarProps {
  onMenuClick: () => void;
  onCommandBarOpen: () => void;
}

export function StaffTopbar({ onMenuClick, onCommandBarOpen }: StaffTopbarProps) {
  const { user, profile, signOut } = useAuth();
  const { currentResort } = useResort();

  return (
    <header className="sticky top-0 z-20 h-14 lg:h-16 border-b border-border/30 surface-glass-strong">
      <div className="flex h-full items-center justify-between px-4 lg:px-6 gap-4">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden -ml-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile: Resort name */}
          <div className="flex items-center gap-2 lg:hidden min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <ProperaMark size={16} />
            </div>
            <span className="text-sm font-bold text-foreground truncate">
              {currentResort?.name || 'Select Resort'}
            </span>
          </div>

          {/* Desktop: Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-4 min-w-0 flex-1">
            <StaffBreadcrumbs className="text-muted-foreground" />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Command Bar Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={onCommandBarOpen}
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground h-9 px-3"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-2xs text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>

          {/* Mobile search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommandBarOpen}
            className="md:hidden text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Button>

          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden md:flex items-center gap-2 h-9 pl-2 pr-3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                  {profile?.full_name || 'Staff'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name || 'Staff User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
