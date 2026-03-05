import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDepartment } from '@/contexts/DepartmentContext';
import { ThemeToggle } from '@/components/ThemeToggle';

interface DepartmentTopbarProps {
  onMenuClick: () => void;
}

export function DepartmentTopbar({ onMenuClick }: DepartmentTopbarProps) {
  const { currentDepartment } = useDepartment();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/30 bg-background/95 backdrop-blur-sm px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold truncate">
          {currentDepartment?.name ?? 'Department'}
        </span>
      </div>

      <ThemeToggle />
    </header>
  );
}
