import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, User, Home, Baby, ChevronDown, ChevronUp } from 'lucide-react';
import { useTravelParty, TravelPartyMember } from '@/hooks/useTravelParty';
import { cn } from '@/lib/utils';

type SelectionMode = 'just_me' | 'my_room' | 'select';

interface AttendeeSelectorProps {
  guestId: string;
  roomNumber: string;
  maxAttendees?: number;
  onSelectionChange: (memberIds: string[], totalPax: { adults: number; children: number }) => void;
  className?: string;
}

export function AttendeeSelector({
  guestId,
  roomNumber,
  maxAttendees,
  onSelectionChange,
  className,
}: AttendeeSelectorProps) {
  const { travelParty, membersByRoom, isLoading } = useTravelParty();
  const [mode, setMode] = useState<SelectionMode>('my_room');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  // Find current guest's member record
  const currentGuestMember = travelParty?.members?.find(m => m.guest_id === guestId);
  
  // Find all members in current room
  const myRoomMembers = membersByRoom[roomNumber] || [];
  
  // Check if there are multiple rooms
  const hasMultipleRooms = Object.keys(membersByRoom).filter(r => r !== 'No Room').length > 1;
  const hasPartyMembers = (travelParty?.members?.length || 0) > 1;

  // Initialize selection based on mode
  useEffect(() => {
    if (!travelParty?.members?.length) return;

    let newSelected = new Set<string>();
    
    if (mode === 'just_me' && currentGuestMember) {
      newSelected.add(currentGuestMember.id);
    } else if (mode === 'my_room') {
      myRoomMembers.forEach(m => newSelected.add(m.id));
    } else if (mode === 'select') {
      // Keep current selection in select mode
      newSelected = new Set(selectedMemberIds);
      // Ensure at least current guest is selected
      if (newSelected.size === 0 && currentGuestMember) {
        newSelected.add(currentGuestMember.id);
      }
    }

    setSelectedMemberIds(newSelected);
  }, [mode, travelParty, currentGuestMember, roomNumber]);

  // Notify parent of selection changes
  useEffect(() => {
    if (!travelParty?.members?.length) {
      onSelectionChange([], { adults: 1, children: 0 });
      return;
    }

    const selectedMembers = travelParty.members.filter(m => selectedMemberIds.has(m.id));
    const adults = selectedMembers.filter(m => m.member_type === 'adult').length || 1;
    const children = selectedMembers.filter(m => m.member_type === 'child').length;
    
    onSelectionChange(Array.from(selectedMemberIds), { adults, children });
  }, [selectedMemberIds, travelParty]);

  const toggleMember = (memberId: string) => {
    if (mode !== 'select') return;
    
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(memberId)) {
      // Don't allow deselecting all members
      if (newSelected.size > 1) {
        newSelected.delete(memberId);
      }
    } else {
      // Check max attendees
      if (!maxAttendees || newSelected.size < maxAttendees) {
        newSelected.add(memberId);
      }
    }
    setSelectedMemberIds(newSelected);
  };

  // Simple fallback if no travel party
  if (isLoading || !travelParty || !hasPartyMembers) {
    return null; // Will use default num_adults/num_children inputs
  }

  const totalSelected = selectedMemberIds.size;
  const selectedAdults = travelParty.members.filter(m => selectedMemberIds.has(m.id) && m.member_type === 'adult').length;
  const selectedChildren = travelParty.members.filter(m => selectedMemberIds.has(m.id) && m.member_type === 'child').length;

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">Who's joining?</Label>
      
      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as SelectionMode)}
        className="grid grid-cols-3 gap-2"
      >
        <Label
          htmlFor="just_me"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors",
            mode === 'just_me' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="just_me" id="just_me" className="sr-only" />
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">Just me</span>
        </Label>
        
        <Label
          htmlFor="my_room"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors",
            mode === 'my_room' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="my_room" id="my_room" className="sr-only" />
          <Home className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">My room</span>
          <span className="text-[10px] text-muted-foreground">({myRoomMembers.length})</span>
        </Label>
        
        <Label
          htmlFor="select"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors",
            mode === 'select' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="select" id="select" className="sr-only" />
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">Select</span>
        </Label>
      </RadioGroup>

      {/* Selection summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {totalSelected} attendee{totalSelected !== 1 ? 's' : ''}: {selectedAdults} adult{selectedAdults !== 1 ? 's' : ''}
          {selectedChildren > 0 && `, ${selectedChildren} child${selectedChildren !== 1 ? 'ren' : ''}`}
        </span>
        {maxAttendees && totalSelected >= maxAttendees && (
          <Badge variant="secondary" className="text-xs">Max reached</Badge>
        )}
      </div>

      {/* Expanded attendee list for 'select' mode */}
      {mode === 'select' && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 space-y-3">
            {Object.entries(membersByRoom).map(([room, members]) => (
              <div key={room}>
                {hasMultipleRooms && (
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    Room {room}
                  </p>
                )}
                <div className="space-y-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        selectedMemberIds.has(member.id) ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={selectedMemberIds.has(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                        disabled={
                          !selectedMemberIds.has(member.id) && 
                          !!maxAttendees && 
                          totalSelected >= maxAttendees
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {member.display_name}
                          </span>
                          {member.is_lead && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Lead
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {member.member_type === 'child' ? (
                            <span className="flex items-center gap-1">
                              <Baby className="h-3 w-3" />
                              Child
                              {member.birth_year && ` (${new Date().getFullYear() - member.birth_year}y)`}
                            </span>
                          ) : (
                            <span>Adult</span>
                          )}
                          {member.relationship_label && (
                            <span>· {member.relationship_label}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
