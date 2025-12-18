import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AddPartyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    displayName: string;
    memberType: 'adult' | 'child';
    birthYear?: number;
    relationshipLabel?: string;
  }) => Promise<unknown>;
  isLoading?: boolean;
}

export function AddPartyMemberDialog({
  open,
  onOpenChange,
  onAdd,
  isLoading,
}: AddPartyMemberDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [memberType, setMemberType] = useState<'adult' | 'child'>('adult');
  const [birthYear, setBirthYear] = useState('');
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      await onAdd({
        displayName: displayName.trim(),
        memberType,
        birthYear: birthYear ? parseInt(birthYear) : undefined,
        relationshipLabel: relationship || undefined,
      });
      // Reset form
      setDisplayName('');
      setMemberType('adult');
      setBirthYear('');
      setRelationship('');
      onOpenChange(false);
    } catch (err) {
      setError('Failed to add member');
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Travel Companion</DialogTitle>
            <DialogDescription>
              Add someone travelling with you to easily book activities together.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Sarah"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={memberType}
                  onValueChange={(v) => setMemberType(v as 'adult' | 'child')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select
                  value={relationship || '__none__'}
                  onValueChange={(v) => setRelationship(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Partner">Partner</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Colleague">Colleague</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {memberType === 'child' && (
              <div className="space-y-2">
                <Label>Birth Year (for age policies)</Label>
                <Select
                  value={birthYear || '__none__'}
                  onValueChange={(v) => setBirthYear(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {yearOptions.slice(0, 18).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year} ({currentYear - year} years old)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
