// Guest notifications page

import { useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
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

  const variant = getNotificationVariant(notification.type);
  const accentMap: Record<string, string> = {
    confirmed: 'bg-emerald-500',
    pending: 'bg-amber-500',
    cancelled: 'bg-red-500',
    default: 'bg-muted-foreground',
  };

  return (
    <MobileCard
      onClick={onClick}
      accentColor={!notification.is_read ? accentMap[variant] : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0 bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {formatNotificationDate(notification.created_at)}
            </p>
            <StatusPill variant={variant} label={variant === 'default' ? 'Info' : variant.charAt(0).toUpperCase() + variant.slice(1)} size="sm" />
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

function NotificationSkeleton() {
  return (
    <MobileCard>
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </MobileCard>
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
      <MobilePageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        onBack={() => navigate('/guest')}
        actions={unreadCount > 0 ? (
          <Button 
            variant="outline" 
            size="sm"
            className="h-10 tap-target"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            {t('notifications.markAllRead')}
          </Button>
        ) : undefined}
      />

      {/* Notifications list */}
      {isLoading ? (
        <div className="space-y-3">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </div>
      ) : notifications.length === 0 ? (
        <MobileCard>
          <div className="text-center py-4">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">{t('notifications.noNotifications')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('notifications.noNotificationsDescription')}
            </p>
            <Button className="h-11" onClick={() => navigate('/guest/bookings')}>
              {t('notifications.viewMyBookings')}
            </Button>
          </div>
        </MobileCard>
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