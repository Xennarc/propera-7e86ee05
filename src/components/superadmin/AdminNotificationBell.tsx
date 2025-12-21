import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useResort } from '@/contexts/ResortContext';
import {
  useAdminNotifications,
  useUnreadAdminNotificationCount,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
  AdminNotification,
} from '@/hooks/useAdminNotifications';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  Check,
} from 'lucide-react';

function getSeverityConfig(severity: AdminNotification['severity']) {
  switch (severity) {
    case 'critical':
      return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
    case 'error':
      return { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' };
    default:
      return { icon: Info, color: 'text-info', bg: 'bg-info/10' };
  }
}

export function AdminNotificationBell() {
  const navigate = useNavigate();
  const { resorts } = useResort();
  const [open, setOpen] = useState(false);

  const { data: notifications, isLoading } = useAdminNotifications(resorts);
  const { data: unreadCount } = useUnreadAdminNotificationCount();
  const markRead = useMarkAdminNotificationRead();
  const markAllRead = useMarkAllAdminNotificationsRead();

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.link_url) {
      navigate(notification.link_url);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {(unreadCount || 0) > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {(unreadCount || 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => {
                const config = getSeverityConfig(notification.severity);
                const Icon = config.icon;
                
                return (
                  <button
                    key={notification.id}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${!notification.is_read ? '' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                          {notification.resort_name && (
                            <>
                              <span>•</span>
                              <span>{notification.resort_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {notification.link_url && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No notifications</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
