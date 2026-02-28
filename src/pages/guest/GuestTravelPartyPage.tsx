import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useTravelParty, TravelPartyMember } from '@/hooks/useTravelParty';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Link2,
  Home,
  Baby,
  User,
  Trash2,
  Crown,
} from 'lucide-react';
import { AddPartyMemberDialog } from '@/components/guest/AddPartyMemberDialog';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { LinkRoomDialog } from '@/components/guest/LinkRoomDialog';
import { cn } from '@/lib/utils';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';

export default function GuestTravelPartyPage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const {
    travelParty,
    isLoading,
    membersByRoom,
    adultsCount,
    childrenCount,
    roomsCount,
    addMember,
    isAddingMember,
    linkRoom,
    isLinkingRoom,
    removeMember,
    isRemovingMember,
  } = useTravelParty();

  const [showAddMember, setShowAddMember] = useState(false);
  const [showLinkRoom, setShowLinkRoom] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TravelPartyMember | null>(null);

  if (!guest) return null;

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember(memberToRemove.id);
    setMemberToRemove(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <GuestPageShell className="space-y-4">
      {/* Header */}
      <MobilePageHeader 
        title={travelParty?.name || 'Your Travel Party'}
        subtitle={`${adultsCount} adult${adultsCount !== 1 ? 's' : ''}${childrenCount > 0 ? `, ${childrenCount} child${childrenCount !== 1 ? 'ren' : ''}` : ''}${roomsCount > 1 ? ` · ${roomsCount} rooms` : ''}`}
      />

      {/* Overview Card */}
      <Card className="guest-card bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {travelParty?.name || 'Your Travel Party'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {adultsCount} adult{adultsCount !== 1 ? 's' : ''}
                {childrenCount > 0 && `, ${childrenCount} child${childrenCount !== 1 ? 'ren' : ''}`}
                {roomsCount > 1 && ` · ${roomsCount} rooms linked`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => setShowAddMember(true)}
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-sm">Add Person</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => setShowLinkRoom(true)}
        >
          <Link2 className="h-5 w-5" />
          <span className="text-sm">Link Room</span>
        </Button>
      </div>

      {/* Members by Room */}
      <div className="space-y-4">
        {Object.entries(membersByRoom).map(([room, members]) => (
          <Card key={room} className="guest-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                {room === 'No Room' ? 'Not assigned to a room' : `Room ${room}`}
                {room === guest.roomNumber && (
                  <Badge variant="secondary" className="text-xs">Your room</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((member) => {
                const isCurrentGuest = member.guest_id === guest.guestId;
                const canRemove = !isCurrentGuest && !member.guest_id; // Can only remove non-guest members
                
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      isCurrentGuest ? "bg-primary/5" : "bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      member.member_type === 'child' ? "bg-amber-500/10" : "bg-primary/10"
                    )}>
                      {member.member_type === 'child' ? (
                        <Baby className="h-5 w-5 text-amber-600" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {member.display_name}
                        </span>
                        {member.is_lead && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        {isCurrentGuest && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{member.member_type}</span>
                        {member.relationship_label && (
                          <span>· {member.relationship_label}</span>
                        )}
                        {member.birth_year && member.member_type === 'child' && (
                          <span>· {new Date().getFullYear() - member.birth_year} years</span>
                        )}
                      </div>
                    </div>

                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Linking rooms and adding companions lets you book activities for your whole group at once.
          </p>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddPartyMemberDialog
        open={showAddMember}
        onOpenChange={setShowAddMember}
        onAdd={addMember}
        isLoading={isAddingMember}
      />

      <LinkRoomDialog
        open={showLinkRoom}
        onOpenChange={setShowLinkRoom}
        onLink={linkRoom}
        isLoading={isLinkingRoom}
      />

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from party?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.display_name} will be removed from your travel party. 
              Any bookings that include them will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingMember ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GuestPageShell>
  );
}
