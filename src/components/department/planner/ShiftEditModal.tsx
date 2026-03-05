/**
 * ShiftEditModal – Confirm creation / edit / delete of a staff shift.
 * Shows overlap warnings. Used after drag interactions.
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  /** If set, this is an edit of an existing shift */
  shiftId?: string;
  warnings: string[];
  onSave: (startTime: string, endTime: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export function ShiftEditModal({
  open, onOpenChange, staffName, date,
  startTime: initialStart, endTime: initialEnd,
  shiftId, warnings, onSave, onDelete, onCancel,
}: Props) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(start, end);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Delete this shift?')) return;
    setSaving(true);
    await onDelete();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {shiftId ? 'Edit Shift' : 'Create Shift'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{staffName} · {date}</p>
        </DialogHeader>

        {warnings.length > 0 && (
          <Alert variant="destructive" className="border-warning/50 bg-warning/5 text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs">
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Start</Label>
            <Input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              step={900}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End</Label>
            <Input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              step={900}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          {shiftId && onDelete && (
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={saving} className="mr-auto">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || start >= end}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {shiftId ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
