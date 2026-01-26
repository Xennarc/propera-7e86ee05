import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, MessageSquare, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface FABAction {
  icon: React.ElementType;
  label: string;
  href: string;
}

const defaultActions: FABAction[] = [
  { icon: UserPlus, label: 'Check-in Guest', href: '/staff/guests/new' },
  { icon: MessageSquare, label: 'New Request', href: '/staff/guest-requests/new' },
  { icon: Calendar, label: 'New Booking', href: '/staff/activities/sessions/new' },
];

interface SmartFABProps {
  /** Custom actions (defaults to Check-in, Request, Booking) */
  actions?: FABAction[];
  /** Additional className */
  className?: string;
}

/**
 * Smart Floating Action Button for dashboard quick actions.
 * Positioned above MobileBottomNav, hidden on desktop (lg+).
 * Hides when keyboard is open.
 */
export function SmartFAB({ actions = defaultActions, className }: SmartFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isKeyboardOpen } = useKeyboardInset();

  // Hide on desktop and when keyboard is open
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed bottom-24 right-4 z-40 lg:hidden",
        "flex flex-col items-end gap-3",
        className
      )}
    >
      {/* Action Buttons - Expanded State */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex flex-col gap-2"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ 
                  duration: 0.15, 
                  delay: index * 0.03,
                  ease: 'easeOut' 
                }}
              >
                <Link
                  to={action.href}
                  onClick={() => setIsExpanded(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl",
                    "bg-card border border-border/60",
                    "shadow-lg backdrop-blur-sm",
                    "hover:bg-muted/80 active:scale-[0.97]",
                    "transition-all duration-100",
                    "min-w-[180px]"
                  )}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-14 w-14 rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg glow-lime",
          "flex items-center justify-center",
          "active:scale-95 transition-transform duration-100",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        aria-label={isExpanded ? "Close quick actions" : "Quick actions"}
        aria-expanded={isExpanded}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>

      {/* Backdrop to close on outside click */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[-1]"
            onClick={() => setIsExpanded(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
