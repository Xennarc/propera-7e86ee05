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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Users, Search, ArrowRight } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CloneAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
  resortId: string;
  onClone: (sourceUserId: string) => void;
  isCloning?: boolean;
}

export function CloneAccessDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  resortId,
  onClone,
  isCloning,
}: CloneAccessDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['resort-staff-for-clone', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, username,
          user_resort_roles!inner(resort_id, role:roles(name))
        `)
        .neq('id', targetUserId);

      if (error) throw error;

      // Filter to users with roles in this resort
      return (data || []).filter((p: any) =>
        p.user_resort_roles?.some((r: any) => r.resort_id === resortId)
      ).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        roleName: p.user_resort_roles?.find((r: any) => r.resort_id === resortId)?.role?.name || 'Unknown',
      }));
    },
    enabled: open,
  });

  const filteredStaff = staffList.filter((s: any) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (s.full_name || '').toLowerCase().includes(q) ||
           (s.username || '').toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Clone Access From
          </DialogTitle>
          <DialogDescription>
            Copy all permission overrides from another staff member to {targetUserName}.
            This will replace any existing custom overrides.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search staff…"
            debounceMs={200}
          />

          <ScrollArea className="h-[240px]">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No other staff found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredStaff.map((staff: any) => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedUser(staff.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                      selectedUser === staff.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/30 hover:bg-accent/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {staff.full_name || staff.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {staff.username ? `@${staff.username}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {staff.roleName}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedUser && onClone(selectedUser)}
            disabled={!selectedUser || isCloning}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
            Clone Overrides
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
