import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Home, User, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function GuestProfilePage() {
  const { guest } = useGuestAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
          <h1 className="text-xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
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
              <p className="text-muted-foreground">{t('profile.welcome', { name: firstName })}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resort Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('profile.resort')}
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
            {t('profile.accommodation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('profile.roomNumber')}</span>
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
            {t('profile.stayDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('profile.checkInDate')}</p>
              <p className="font-semibold text-foreground">
                {format(checkInDate, 'EEE, MMM d')}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(checkInDate, 'yyyy')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('profile.checkOutDate')}</p>
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
                <span className="text-muted-foreground">{t('profile.totalStay')}</span>
              </div>
              <span className="font-semibold text-foreground">
                {stayLength} {stayLength === 1 ? t('common.night') : t('common.nights')}
              </span>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('profile.stayProgress')}</span>
              <span className="font-medium text-foreground">
                {t('profile.dayOf', { current: daysStayed + 1, total: stayLength + 1 })}
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
                {daysRemaining === 1 
                  ? t('profile.nightRemaining')
                  : t('profile.nightsRemaining', { count: daysRemaining })}
              </p>
            ) : (
              <p className="text-xs text-primary text-center font-medium">
                {t('profile.checkoutDay')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            {t('profile.helpText')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}