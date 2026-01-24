/**
 * Staff-facing Travel Party card for Guest Detail page.
 * Shows party members or empty state with CTA to create.
 */

import { Users, Plus, Crown, Baby, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffTravelParty, StaffTravelPartyMember } from '@/hooks/useStaffTravelParty';

interface StaffTravelPartyCardProps {
  guestId: string;
  guestName: string;
  resortId: string;
}

export function StaffTravelPartyCard({
  guestId,
  guestName,
  resortId,
}: StaffTravelPartyCardProps) {
  const { party, hasParty, isLoading, createParty, isCreating } = useStaffTravelParty({
    guestId,
    guestName,
    resortId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Travel Party
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCreate = async () => {
    await createParty();
  };

  // Empty state
  if (!hasParty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Travel Party
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-1">No travel party linked</p>
            <p className="text-sm text-muted-foreground mb-4">
              Group bookings and linked rooms
            </p>
            <Button onClick={handleCreate} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Travel Party'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group members by room
  const membersByRoom = party!.members.reduce<Record<string, StaffTravelPartyMember[]>>(
    (acc, member) => {
      const room = member.roomNumber || 'No room assigned';
      if (!acc[room]) acc[room] = [];
      acc[room].push(member);
      return acc;
    },
    {}
  );

  const totalMembers = party!.members.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {party!.name || 'Travel Party'}
        </CardTitle>
        <Badge variant="secondary">{totalMembers} {totalMembers === 1 ? 'person' : 'people'}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(membersByRoom).map(([room, members]) => (
            <div key={room} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {room === 'No room assigned' ? room : `Room ${room}`}
              </p>
              <div className="space-y-2">
                {members.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: StaffTravelPartyMember }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{member.displayName}</span>
        {member.birthYear && (
          <span className="text-sm text-muted-foreground">({member.birthYear})</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {member.relationshipLabel && (
          <Badge variant="outline" className="text-xs">
            {member.relationshipLabel}
          </Badge>
        )}
        {member.isLead && (
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Lead
          </Badge>
        )}
        {member.memberType === 'child' ? (
          <Badge variant="secondary" className="text-xs">
            <Baby className="h-3 w-3 mr-1" />
            Child
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Adult
          </Badge>
        )}
      </div>
    </div>
  );
}
