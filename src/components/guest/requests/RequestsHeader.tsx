import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardList, Sparkles } from 'lucide-react';

interface RequestsHeaderProps {
  activeCount: number;
  tagline?: string;
}

export const RequestsHeader = memo(function RequestsHeader({ activeCount, tagline }: RequestsHeaderProps) {
  const displayTagline = tagline || 'Tap what you need — we\'ll notify the team.';
  
  // Extract the first word and rest of tagline for styling
  const firstSpaceIndex = displayTagline.indexOf(' ');
  const firstWord = firstSpaceIndex > 0 ? displayTagline.slice(0, firstSpaceIndex) : displayTagline;
  const restOfTagline = firstSpaceIndex > 0 ? displayTagline.slice(firstSpaceIndex) : '';

  return (
    <header className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            {/* Enhanced icon with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/25 blur-md animate-pulse" />
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
            Requests
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className="gap-1.5 relative text-muted-foreground hover:text-foreground"
          >
            <Link to="/guest/requests/my">
              <ClipboardList className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">My Requests</span>
              <AnimatePresence>
                {activeCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30"
                  >
                    {activeCount > 9 ? '9+' : activeCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </Button>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="text-sm text-muted-foreground"
      >
        <span className="text-primary font-medium">{firstWord}</span>{restOfTagline}
      </motion.p>
    </header>
  );
});