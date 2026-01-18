import { Bell, Calendar, User, MessageSquare, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const notifications = [
  {
    id: 1,
    icon: Calendar,
    title: 'New booking',
    message: 'Sunset Cruise - 4 guests',
    time: 'Just now',
    color: 'bg-lagoon/10 text-lagoon',
    unread: true,
  },
  {
    id: 2,
    icon: Star,
    title: 'VIP arriving',
    message: 'Mr. Chen - Villa 12',
    time: '5 min ago',
    color: 'bg-sunset/10 text-sunset',
    unread: true,
  },
  {
    id: 3,
    icon: MessageSquare,
    title: 'Guest request',
    message: 'Extra pillows - Room 204',
    time: '12 min ago',
    color: 'bg-orchid/10 text-orchid',
    unread: false,
  },
  {
    id: 4,
    icon: User,
    title: 'Check-in complete',
    message: 'The Williams Family',
    time: '25 min ago',
    color: 'bg-primary/10 text-primary',
    unread: false,
  },
];

export function NotificationStreamShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("w-[240px] bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">
              2
            </span>
          </div>
          <span className="text-xs font-bold text-foreground">Notifications</span>
        </div>
        <span className="text-[9px] text-primary font-medium cursor-pointer hover:underline">
          Mark all read
        </span>
      </div>

      {/* Notification list */}
      <div className="divide-y divide-border/30">
        {notifications.map((notif) => {
          const Icon = notif.icon;
          return (
            <div
              key={notif.id}
              className={cn(
                "p-3 flex items-start gap-2.5 transition-colors hover:bg-muted/30",
                notif.unread && "bg-primary/5"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                notif.color
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold text-foreground">{notif.title}</p>
                  {notif.unread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground truncate">{notif.message}</p>
              </div>
              <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground shrink-0">
                <Clock className="h-2.5 w-2.5" />
                <span>{notif.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/30 bg-muted/20">
        <p className="text-[9px] text-center text-primary font-medium cursor-pointer hover:underline">
          View all notifications
        </p>
      </div>
    </div>
  );
}
