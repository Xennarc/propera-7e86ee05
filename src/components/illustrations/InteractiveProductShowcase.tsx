import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { Smartphone, Monitor, BarChart3, Calendar, Users, Bell, Check, ChefHat } from 'lucide-react';
import { FloatingUIChip } from './FloatingUIChip';

const tabs = [
  { id: 'guest', label: 'Guest Portal', icon: Smartphone },
  { id: 'staff', label: 'Staff Console', icon: Monitor },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const guestBookings = [
  { name: 'Snorkel Safari', time: '09:30', status: 'confirmed' },
  { name: 'Sunset Cruise', time: '17:00', status: 'pending' },
  { name: 'Couples Massage', time: '14:00', status: 'confirmed' },
];

const staffTasks = [
  { task: 'Check-in: Villa 12', time: '10:00', done: false },
  { task: 'Spa setup: Room 8', time: '13:30', done: true },
  { task: 'Restaurant: VIP table', time: '19:00', done: false },
];

export function InteractiveProductShowcase() {
  const { shouldAnimate } = useAnimationPreference();
  const [activeTab, setActiveTab] = useState('guest');
  const [typingIndex, setTypingIndex] = useState(0);

  // Auto-cycle through tabs
  useEffect(() => {
    if (!shouldAnimate) return;
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const currentIndex = tabs.findIndex(t => t.id === prev);
        return tabs[(currentIndex + 1) % tabs.length].id;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [shouldAnimate]);

  // Typing animation for guest bookings
  useEffect(() => {
    if (!shouldAnimate || activeTab !== 'guest') return;
    setTypingIndex(0);
    const interval = setInterval(() => {
      setTypingIndex(prev => {
        if (prev >= guestBookings.length) return prev;
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [activeTab, shouldAnimate]);

  return (
    <div className="relative">
      {/* Floating status chips */}
      <FloatingUIChip 
        icon={Bell}
        text="New booking" 
        subtext="Just now"
        variant="primary"
        delay={0.8}
        className="absolute -top-4 -right-6 z-20 hidden lg:block"
      />
      
      <FloatingUIChip 
        icon={Users}
        text="5 guests arriving" 
        variant="success"
        delay={1.2}
        className="absolute top-1/3 -left-8 z-20 hidden lg:block"
      />

      {/* Main showcase frame */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.95, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`preview-frame-premium ${shouldAnimate ? 'animate-gentle-float' : ''}`}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-border/30 bg-muted/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`${shouldAnimate ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[10px] text-success">Live</span>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 min-h-[280px]">
          <AnimatePresence mode="wait">
            {activeTab === 'guest' && (
              <motion.div
                key="guest"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">My Bookings</span>
                </div>
                {guestBookings.map((booking, i) => (
                  <motion.div
                    key={booking.name}
                    initial={shouldAnimate ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                    animate={{ 
                      opacity: shouldAnimate ? (i < typingIndex ? 1 : 0.3) : 1, 
                      x: 0 
                    }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/20 hover:border-primary/30 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${booking.status === 'confirmed' ? 'bg-success/10' : 'bg-sunset-100'}`}>
                        {booking.status === 'confirmed' ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Calendar className="h-4 w-4 text-sunset-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{booking.name}</p>
                        <p className="text-xs text-muted-foreground">{booking.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${booking.status === 'confirmed' ? 'text-success' : 'text-sunset-500'}`}>
                      {booking.status}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Today's Tasks</span>
                </div>
                {staffTasks.map((task, i) => (
                  <motion.div
                    key={task.task}
                    initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      task.done 
                        ? 'bg-success/5 border-success/20' 
                        : 'bg-background/60 border-border/20 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        task.done ? 'border-success bg-success' : 'border-muted-foreground'
                      }`}>
                        {task.done && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className={`text-sm ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.task}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{task.time}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Today's Overview</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Bookings', value: '24', trend: '+12%' },
                    { label: 'Revenue', value: '$4.2k', trend: '+8%' },
                    { label: 'Guests', value: '156', trend: '+5%' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-background/60 rounded-lg p-3 border border-border/20 text-center"
                    >
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground mb-1">{stat.label}</p>
                      <span className="text-[10px] text-success font-medium">{stat.trend}</span>
                    </motion.div>
                  ))}
                </div>
                {/* Mini chart visualization */}
                <div className="h-20 bg-background/40 rounded-lg border border-border/20 flex items-end justify-around px-4 py-2">
                  {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={shouldAnimate ? { height: 0 } : { height: `${height}%` }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                      className="w-4 bg-gradient-to-t from-primary to-teal-400 rounded-t-sm"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom floating chip */}
      <FloatingUIChip 
        icon={ChefHat}
        text="Dinner reservation" 
        subtext="Table for 4 at 7pm"
        delay={1.5}
        className="absolute -bottom-6 -right-4 hidden md:block"
      />
    </div>
  );
}
