/**
 * ShiftEditModal – Confirm creation / edit / delete of a staff shift.
 * Shows overlap warnings, quick presets for mobile, validation.
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Trash2, Copy } from 'lucide-react';

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
  onDuplicate?: () => Promise<void>;
  onCancel: () => void;
}

const QUICK_PRESETS = [
  { label: 'Morning', start: '08:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '16:00' },
  { label: 'Evening', start: '16:00', end: '20:00' },
  { label: 'Full Day', start: '08:00', end: '17:00' },
];

export function ShiftEditModal({
  open, onOpenChange, staffName, date,
  startTime: initialStart, endTime: initialEnd,
  shiftId, warnings, onSave, onDelete, onDuplicate, onCancel,
}: Props) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);

  // Reset when modal opens with new values
  useEffect(() => {
    if (open) {
      setStart(initialStart);
      setEnd(initialEnd);
    }
  }, [open, initialStart, initialEnd]);

  const isValid = start < end;

  const handleSave = async () => {
    if (!isValid) return;
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

  const handleDuplicate = async () => {
    if (!onDuplicate) return;
    setSaving(true);
    await onDuplicate();
    setSaving(false);
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[number]) => {
    setStart(preset.start);
    setEnd(preset.end);
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

        {/* Quick presets – especially useful on mobile */}
        {!shiftId && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map(p => (
                <Button
                  key={p.label}
                  variant={start === p.start && end === p.end ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                  <span className="ml-1 text-[10px] opacity-60">{p.start.slice(0, 5)}–{p.end.slice(0, 5)}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Start</Label>
            <Input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              step={900}
              className="h-9 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End</Label>
            <Input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              step={900}
              className="h-9 text-base"
            />
          </div>
        </div>

        {!isValid && start !== '' && end !== '' && (
          <p className="text-xs text-destructive">End time must be after start time</p>
        )}

        <DialogFooter className="flex-row gap-2">
          <div className="flex items-center gap-1 mr-auto">
            {shiftId && onDelete && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={saving}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
            {shiftId && onDuplicate && (
              <Button variant="ghost" size="sm" onClick={handleDuplicate} disabled={saving} title="Duplicate to next day">
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isValid}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {shiftId ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
