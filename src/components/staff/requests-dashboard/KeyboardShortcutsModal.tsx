import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: 'A', description: 'Acknowledge selected request' },
  { key: 'S', description: 'Start selected request' },
  { key: 'C', description: 'Complete selected request' },
  { key: '↑ / ↓', description: 'Navigate between requests' },
  { key: 'Enter', description: 'Open request details' },
  { key: 'Esc', description: 'Deselect / close drawer' },
  { key: 'R', description: 'Refresh dashboard' },
  { key: '1 / 2 / 3', description: 'Switch to lane (New / In Progress / Completed)' },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded border border-border">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
