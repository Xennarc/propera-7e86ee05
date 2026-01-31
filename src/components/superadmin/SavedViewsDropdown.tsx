import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { SavedView } from '@/hooks/superadmin/useUsersFilter';
import { toast } from 'sonner';

interface SavedViewsDropdownProps {
  views: SavedView[];
  onApply: (view: SavedView) => void;
  onSave: (name: string) => SavedView;
  onDelete: (viewId: string) => void;
  hasActiveFilters: boolean;
}

export function SavedViewsDropdown({
  views,
  onApply,
  onSave,
  onDelete,
  hasActiveFilters,
}: SavedViewsDropdownProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const defaultViews = views.filter((v) => v.isDefault);
  const customViews = views.filter((v) => !v.isDefault);

  const handleSave = () => {
    if (!viewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }
    onSave(viewName.trim());
    toast.success('View saved');
    setViewName('');
    setSaveDialogOpen(false);
  };

  const handleDelete = (viewId: string, viewName: string) => {
    onDelete(viewId);
    toast.success(`Deleted "${viewName}"`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Views</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Quick Views
          </DropdownMenuLabel>
          {defaultViews.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => onApply(view)}
              className="cursor-pointer"
            >
              {view.name}
            </DropdownMenuItem>
          ))}

          {customViews.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Custom Views
              </DropdownMenuLabel>
              {customViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="cursor-pointer group flex items-center justify-between"
                  onClick={() => onApply(view)}
                >
                  <span>{view.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(view.id, view.name);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSaveDialogOpen(true)}
            disabled={!hasActiveFilters}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save your current filter settings as a reusable view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="viewName">View name</Label>
              <Input
                id="viewName"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="e.g., Active managers"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
