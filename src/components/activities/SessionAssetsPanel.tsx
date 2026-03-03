/**
 * SessionAssetsPanel – Assign guides, boats, equipment to a session
 * with conflict detection for overlapping sessions.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Ship,
  User,
  Package,
  Anchor,
} from 'lucide-react';
import {
  useSessionAssets,
  useAddSessionAsset,
  useRemoveSessionAsset,
  useSessionAssetConflicts,
  SessionAssetType,
  SessionAsset,
} from '@/hooks/useSessionAssets';

interface Props {
  sessionId: string;
  resortId: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  canEdit: boolean;
}

const ASSET_TYPE_CONFIG: Record<SessionAssetType, { label: string; icon: typeof Ship; placeholder: string }> = {
  guide: { label: 'Guide', icon: User, placeholder: 'e.g. Ahmed, Instructor A' },
  boat: { label: 'Boat', icon: Anchor, placeholder: 'e.g. Dhoni 1, Speedboat 2' },
  equipment: { label: 'Equipment', icon: Package, placeholder: 'e.g. 10x Snorkel Sets' },
};

export function SessionAssetsPanel({ sessionId, resortId, sessionDate, sessionStartTime, sessionEndTime, canEdit }: Props) {
  const { data: assets = [], isLoading } = useSessionAssets(sessionId);
  const { data: conflicts = [] } = useSessionAssetConflicts(sessionId, sessionDate, sessionStartTime, sessionEndTime, resortId);
  const addAsset = useAddSessionAsset(sessionId);
  const removeAsset = useRemoveSessionAsset(sessionId);

  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<SessionAssetType>('guide');
  const [newLabel, setNewLabel] = useState('');
  const [newQty, setNewQty] = useState(1);

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addAsset.mutate(
      { resort_id: resortId, asset_type: newType, asset_label: newLabel.trim(), quantity: newQty },
      {
        onSuccess: () => {
          setNewLabel('');
          setNewQty(1);
          setShowForm(false);
        },
      }
    );
  };

  const grouped: Record<SessionAssetType, SessionAsset[]> = { guide: [], boat: [], equipment: [] };
  for (const a of assets) {
    grouped[a.asset_type]?.push(a);
  }

  const getConflictsForAsset = (label: string, type: SessionAssetType) =>
    conflicts.filter(c => c.asset_label === label && c.asset_type === type);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Assets
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          {canEdit && !showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Assign
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ── Conflict banner ── */}
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Scheduling Conflicts
            </div>
            {conflicts.map((c, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.asset_label}</span> ({c.asset_type}) also assigned to{' '}
                <span className="font-medium text-foreground">{c.conflicting_activity_name}</span>{' '}
                {c.conflicting_start_time.slice(0, 5)}–{c.conflicting_end_time.slice(0, 5)}
              </p>
            ))}
          </div>
        )}

        {/* ── Asset groups ── */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading assets…</div>
        ) : assets.length === 0 && !showForm ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No assets assigned yet
          </div>
        ) : (
          Object.entries(ASSET_TYPE_CONFIG).map(([type, config]) => {
            const items = grouped[type as SessionAssetType];
            if (items.length === 0) return null;
            const Icon = config.icon;
            return (
              <div key={type}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {config.label}s
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(asset => {
                    const assetConflicts = getConflictsForAsset(asset.asset_label, asset.asset_type);
                    const hasConflict = assetConflicts.length > 0;
                    return (
                      <span
                        key={asset.id}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          hasConflict
                            ? 'border-destructive/40 bg-destructive/10 text-destructive'
                            : 'border-border bg-muted/50 text-foreground'
                        }`}
                      >
                        {hasConflict && <AlertTriangle className="h-3 w-3" />}
                        {asset.asset_label}
                        {asset.asset_type === 'equipment' && asset.quantity > 1 && (
                          <span className="opacity-60">×{asset.quantity}</span>
                        )}
                        {canEdit && (
                          <button
                            className="ml-0.5 opacity-40 hover:opacity-100 hover:text-destructive transition-opacity"
                            onClick={() => removeAsset.mutate(asset.id)}
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* ── Add form ── */}
        {showForm && canEdit && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
            <div className="flex gap-2">
              <Select value={newType} onValueChange={(v) => setNewType(v as SessionAssetType)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="boat">Boat</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                placeholder={ASSET_TYPE_CONFIG[newType].placeholder}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              {newType === 'equipment' && (
                <Input
                  type="number"
                  className="w-16"
                  min={1}
                  value={newQty}
                  onChange={e => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewLabel(''); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim() || addAsset.isPending}>
                {addAsset.isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
