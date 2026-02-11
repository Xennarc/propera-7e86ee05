// Guest notification bell with dropdown

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { Bell, Calendar, Utensils, CheckCheck, Car } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { cn } from '@/lib/utils';

function getNotificationIcon(type: string) {
  if (type.includes('ACTIVITY')) return Calendar;
  if (type.includes('RESTAURANT')) return Utensils;
  if (type.includes('TRANSPORT')) return Car;
  return Bell;
}

function getNotificationColor(type: string) {
  if (type.includes('PENDING')) return 'text-orange-500';
  if (type.includes('CONFIRMED') || type.includes('COMPLETED') || type.includes('ARRIVED')) return 'text-green-500';
  if (type.includes('CANCELLED') || type.includes('FAILED')) return 'text-red-500';
  if (type.includes('EN_ROUTE') || type.includes('ASSIGNED')) return 'text-blue-500';
  return 'text-muted-foreground';
}

export function GuestNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllRead 
  } = useGuestNotifications();

  const recentNotifications = notifications.slice(0, 10);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link_url) {
      navigate(notification.link_url);
    } else {
      navigate('/guest/notifications');
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-xs"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recentNotifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {recentNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer',
                    !notification.is_read && 'bg-accent/50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', iconColor)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm line-clamp-1',
                      !notification.is_read && 'font-medium'
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-center justify-center text-sm text-primary cursor-pointer"
          onClick={() => {
            navigate('/guest/notifications');
            setOpen(false);
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
