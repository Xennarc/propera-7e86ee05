import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Home, User, MapPin, Clock, Globe } from 'lucide-react';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/guest/LanguageSwitcher';
import { supportedLanguages } from '@/i18n';
import { ResortDirectory } from '@/components/guest/ResortDirectory';
import { TierGate } from '@/components/tier/TierGate';
import { GuestSessionManager } from '@/components/guest/GuestSessionManager';

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
    <GuestPageShell>
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header */}
      <MobilePageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        onBack={() => navigate('/guest')}
      />

      {/* Guest Card - Premium Hero Treatment */}
      <Card className="guest-card overflow-hidden border-0">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <div className="h-[72px] w-[72px] rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <User className="h-9 w-9 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">{guest.fullName}</h2>
              <p className="text-muted-foreground leading-relaxed">{t('profile.welcome', { name: firstName })}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resort Information */}
      <Card className="guest-card">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="guest-icon-container h-8 w-8">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            {t('profile.resort')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-lg font-semibold text-foreground tracking-tight">
            {guest.resortName || 'Your Resort'}
          </p>
        </CardContent>
      </Card>

      {/* Room Information */}
      <Card className="guest-card">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="guest-icon-container h-8 w-8">
              <Home className="h-4 w-4 text-primary" />
            </div>
            {t('profile.accommodation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('profile.roomNumber')}</span>
            <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
              {guest.roomNumber}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stay Details */}
      <Card className="guest-card">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="guest-icon-container h-8 w-8">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            {t('profile.stayDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
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

          <div className="border-t border-border/30 pt-4">
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

      {/* Resort Directory */}
      <ResortDirectory />

      {/* Login & Devices */}
      <GuestSessionManager />

      {/* Language Settings */}
      <TierGate feature="guest_portal_multi_language" fallback="hide">
        <Card className="guest-card">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className="guest-icon-container h-8 w-8">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              {t('profile.language')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('profile.selectLanguage')}</span>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </TierGate>

      {/* Help Section */}
      <Card className="guest-card bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {t('profile.helpText')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
    </GuestPageShell>
  );
}