/**
 * Session Expired State Component
 * 
 * Shown when a guest deep-links to a session that has already started.
 */

import { Clock, ArrowRight, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SessionExpiredStateProps {
  activityName?: string;
  onViewOtherTimes?: () => void;
}

export function SessionExpiredState({ activityName, onViewOtherTimes }: SessionExpiredStateProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleViewOtherTimes = () => {
    if (onViewOtherTimes) {
      onViewOtherTimes();
    } else {
      navigate('/guest/activities/sessions');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t('guest.sessions.expired.title', 'This session has already started')}
            </h2>
            {activityName && (
              <p className="text-muted-foreground">
                {activityName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('guest.sessions.expired.description', "The time slot you're looking for is no longer available for booking.")}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button 
              onClick={handleViewOtherTimes}
              className="w-full gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('guest.sessions.expired.viewOtherTimes', 'View other times')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => navigate('/guest/activities')}
              className="w-full text-muted-foreground"
            >
              {t('guest.sessions.expired.browseActivities', 'Browse all activities')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Subtle hint shown when some sessions on a date are no longer available.
 */
interface SessionsFilteredHintProps {
  count: number;
}

export function SessionsFilteredHint({ count }: SessionsFilteredHintProps) {
  const { t } = useTranslation();
  
  if (count <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs text-muted-foreground bg-muted/50 rounded-lg">
      <Clock className="h-3 w-3" />
      <span>
        {t('guest.sessions.filtered.hint', {
          count,
          defaultValue: count === 1 
            ? '1 session is no longer available today' 
            : '{{count}} sessions are no longer available today'
        })}
      </span>
    </div>
  );
}
