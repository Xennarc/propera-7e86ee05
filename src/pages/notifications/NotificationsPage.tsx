// Staff notifications page

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, Calendar, Utensils, MessageSquare, AlertCircle, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useStaffNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/notifications';

function getNotificationIcon(type: string) {
  if (type.includes('ACTIVITY')) return Calendar;
  if (type.includes('RESTAURANT')) return Utensils;
  if (type.includes('FEEDBACK')) return MessageSquare;
  return AlertCircle;
}

function getNotificationColor(type: string) {
  if (type.includes('PENDING')) return 'text-orange-500 bg-orange-50 dark:bg-orange-950';
  if (type.includes('CONFIRMED')) return 'text-green-500 bg-green-50 dark:bg-green-950';
  if (type.includes('CANCELLED')) return 'text-red-500 bg-red-50 dark:bg-red-950';
  if (type.includes('FEEDBACK')) return 'text-blue-500 bg-blue-50 dark:bg-blue-950';
  return 'text-muted-foreground bg-muted';
}

function formatNotificationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) {
    return `Today ${format(date, 'HH:mm')}`;
  } else if (isYesterday) {
    return `Yesterday ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'MMM d, HH:mm');
  }
}

function NotificationItem({ 
  notification, 
  onMarkRead,
  onClick 
}: { 
  notification: Notification;
  onMarkRead: () => void;
  onClick: () => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const colorClasses = getNotificationColor(notification.type);

  return (
    <Card 
      className={cn(
        'p-4 cursor-pointer transition-colors hover:bg-accent/50',
        !notification.is_read && 'border-l-4 border-l-primary'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-2 rounded-lg', colorClasses)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'text-sm',
              !notification.is_read && 'font-semibold'
            )}>
              {notification.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {!notification.is_read && (
                <Badge variant="secondary" className="text-xs">
                  Unread
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatNotificationDate(notification.created_at)}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
        </div>
      </div>
    </Card>
  );
}

function NotificationSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </Card>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const { 
    notifications, 
    unreadCount,
    isLoading, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllRead 
  } = useStaffNotifications();

  const filteredNotifications = tab === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates for your resort activity and bookings"
        action={unreadCount > 0 ? (
          <Button 
            variant="outline" 
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        ) : undefined}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
              description={tab === 'unread' 
                ? 'You have no unread notifications.'
                : 'Notifications about bookings and requests will appear here.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => markAsRead(notification.id)}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
