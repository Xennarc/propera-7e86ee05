// Guest notifications page

import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, Calendar, Utensils, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { MobileCard } from '@/components/guest/MobileCard';
import { StatusPill } from '@/components/guest/StatusPill';

function getNotificationIcon(type: string) {
  if (type.includes('ACTIVITY')) return Calendar;
  if (type.includes('RESTAURANT')) return Utensils;
  return Bell;
}

function getNotificationVariant(type: string): 'confirmed' | 'pending' | 'cancelled' | 'default' {
  if (type.includes('CONFIRMED')) return 'confirmed';
  if (type.includes('PENDING')) return 'pending';
  if (type.includes('CANCELLED')) return 'cancelled';
  return 'default';
}

interface GuestNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

function NotificationItem({ 
  notification, 
  onClick,
  t
}: { 
  notification: GuestNotification;
  onClick: () => void;
  t: (key: string) => string;
}) {
  const Icon = getNotificationIcon(notification.type);
  const colorClasses = getNotificationColor(notification.type);

  const formatNotificationDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return `${t('common.today')} ${format(date, 'HH:mm')}`;
    } else if (isYesterday) {
      return `${t('common.yesterday')} ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  return (
    <Card 
      className={cn(
        'p-4 cursor-pointer transition-colors hover:bg-accent/50',
        !notification.is_read && 'border-l-4 border-l-primary'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', colorClasses)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'text-sm',
              !notification.is_read && 'font-semibold'
            )}>
              {notification.title}
            </h3>
            {!notification.is_read && (
              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatNotificationDate(notification.created_at)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function NotificationSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </Card>
  );
}

export default function GuestNotificationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    notifications, 
    unreadCount,
    isLoading, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllRead 
  } = useGuestNotifications();

  const handleNotificationClick = (notification: GuestNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/guest')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{t('notifications.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('notifications.subtitle')}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="space-y-3">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-2">{t('notifications.noNotifications')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('notifications.noNotificationsDescription')}
          </p>
          <Button onClick={() => navigate('/guest/bookings')}>
            {t('notifications.viewMyBookings')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}