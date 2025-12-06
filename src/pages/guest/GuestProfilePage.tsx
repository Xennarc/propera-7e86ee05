import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Home, User, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GuestProfilePage() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();

  if (!guest) {
    return null;
  }

  const checkInDate = new Date(guest.checkInDate);
  const checkOutDate = new Date(guest.checkOutDate);
  const today = new Date();
  const stayLength = differenceInDays(checkOutDate, checkInDate);
  const daysRemaining = Math.max(0, differenceInDays(checkOutDate, today));
  const daysStayed = Math.max(0, differenceInDays(today, checkInDate));

  // Get first name for greeting
  const firstName = guest.fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/guest')}
          className="rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">Your stay details</p>
        </div>
      </div>

      {/* Guest Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{guest.fullName}</h2>
              <p className="text-muted-foreground">Welcome, {firstName}!</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resort Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Resort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-foreground">
            {guest.resortName || 'Your Resort'}
          </p>
        </CardContent>
      </Card>

      {/* Room Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            Accommodation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Room Number</span>
            <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
              {guest.roomNumber}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stay Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Stay Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
              <p className="font-semibold text-foreground">
                {format(checkInDate, 'EEE, MMM d')}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(checkInDate, 'yyyy')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
              <p className="font-semibold text-foreground">
                {format(checkOutDate, 'EEE, MMM d')}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(checkOutDate, 'yyyy')}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Stay</span>
              </div>
              <span className="font-semibold text-foreground">
                {stayLength} {stayLength === 1 ? 'night' : 'nights'}
              </span>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stay progress</span>
              <span className="font-medium text-foreground">
                Day {daysStayed + 1} of {stayLength + 1}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((daysStayed) / (stayLength)) * 100)}%` 
                }}
              />
            </div>
            {daysRemaining > 0 ? (
              <p className="text-xs text-muted-foreground text-center">
                {daysRemaining} {daysRemaining === 1 ? 'night' : 'nights'} remaining
              </p>
            ) : (
              <p className="text-xs text-primary text-center font-medium">
                Check-out day
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Need assistance? Please contact the front desk or visit our reception.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
