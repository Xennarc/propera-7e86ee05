import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, ChevronRight, Sparkles, HelpCircle, Info, Search, X } from 'lucide-react';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { GuestActivitiesLoading } from '@/components/guest/GuestLoadingSkeleton';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { GuestSectionHeader } from '@/components/guest/GuestSectionHeader';
import { cn } from '@/lib/utils';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { CategoryBadge, CategoryChip, CategoryIcon } from '@/components/ui/category-badge';
import { coreActivityCategories, ActivityCategoryKey, getCategoryConfig } from '@/lib/activity-category-config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

export default function GuestActivitiesBrowser() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: Array<{ value: ActivityCategoryKey | 'all'; label: string }> = [
    { value: 'all', label: t('activities.allCategories') },
    ...coreActivityCategories.map(cat => ({ 
      value: cat, 
      label: t(`activities.categories.${cat}`)
    })),
  ];

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: ['guest-available-sessions', guest?.guestId, selectedDate, selectedCategory],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
        p_date: selectedDate,
        p_category: selectedCategory === 'all' ? null : selectedCategory as any,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!guest,
    staleTime: 30000,
  });

  // Check if resort has any activities defined at all
  const { data: activitiesExist } = useQuery({
    queryKey: ['guest-activities-exist', guest?.resortId],
    queryFn: async () => {
      if (!guest) return false;
      const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', guest.resortId)
        .eq('is_active', true);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!guest,
  });

  if (!guest) return null;

  const minDate = guest.checkInDate;
  const maxDate = guest.checkOutDate;

  // Filter sessions by search query
  const filteredSessions = sessions?.filter((session: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.activity_name?.toLowerCase().includes(query) ||
      session.description?.toLowerCase().includes(query) ||
      session.category?.toLowerCase().includes(query)
    );
  }) || [];

  if (isLoading) {
    return <GuestActivitiesLoading />;
  }

  return (
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <MobilePageHeader
        title={t('activities.title')}
        subtitle={t('activities.subtitle')}
        showBack={false}
        actions={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors tap-target flex items-center justify-center h-10 w-10">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>{t('activities.noActivitiesDescription')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Search Input with focus glow and animated clear */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder={t('activities.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 h-11 tap-target focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:shadow-md focus-visible:shadow-primary/10"
        />
        {/* Animated clear button */}
        <AnimatePresence>
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Category Pills with Icons - scroll fade edges */}
      <div className="relative scroll-fade-x">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide scroll-smooth">
          {categories.map((cat) => (
            <CategoryChip
              key={cat.value}
              category={cat.value}
              label={cat.label}
              isActive={selectedCategory === cat.value}
              onClick={() => setSelectedCategory(cat.value)}
            />
          ))}
        </div>
      </div>

      {/* Date Picker with Month Navigation */}
      <GuestDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={minDate}
        maxDate={maxDate}
        hint="Select a date to see available activities"
      />

      {isError ? (
        <Card className="guest-card border-dashed bg-muted/30">
          <GuestEmptyState
            icon={HelpCircle}
            title={t('common.error')}
            description={t('errors.networkError')}
            actionLabel={t('common.retry')}
            onAction={() => window.location.reload()}
          />
        </Card>
      ) : filteredSessions?.length === 0 ? (
        <Card className="guest-card border-dashed bg-muted/30">
          <GuestEmptyState
            icon={Calendar}
            title={searchQuery ? t('common.noResults') : t('activities.noActivities')}
            description={
              searchQuery 
                ? `${t('common.noResults')} "${searchQuery}"`
                : t('activities.noActivitiesDescription')
            }
            actionLabel={searchQuery ? t('common.search') : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions?.map((session: any) => {
            const spotsLeft = session.remaining_spots;
            const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
            const config = getCategoryConfig(session.category);
            
            return (
              <Card
                key={session.id}
                className="guest-card-interactive"
                onClick={() => navigate(`/guest/activities/book/${session.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Activity Image or Category Icon fallback - Larger 64x64 thumbnail */}
                    <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden shadow-md">
                      {session.image_url ? (
                        <>
                          <img 
                            src={session.image_url} 
                            alt={session.activity_name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </>
                      ) : (
                        <div className={cn(
                          "flex h-full w-full items-center justify-center shadow-inner",
                          config.bgClass
                        )}>
                          <CategoryIcon category={session.category} size={28} />
                        </div>
                      )}
                    </div>
                    
                    {/* Content area - vertically centered */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      {/* Top row: Name + Status badge */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {session.activity_name}
                        </h3>
                        {session.requires_approval ? (
                          <Badge variant="pending" className="shrink-0 text-xs whitespace-nowrap">
                            <Sparkles className="h-3 w-3 mr-1" />Request
                          </Badge>
                        ) : (
                          <Badge variant="confirmed" className="shrink-0 text-xs whitespace-nowrap">Instant</Badge>
                        )}
                      </div>
                      
                      {/* Bottom row: Consolidated metadata */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span className={cn("font-mono font-medium", config.colorClass)}>
                            {session.start_time?.slice(0, 5)}
                          </span>
                          <span className="text-border">·</span>
                          <span className="whitespace-nowrap">{session.duration_minutes}{t('common.minutes').charAt(0)}</span>
                          <span className="text-border">·</span>
                          <span className={cn(
                            "whitespace-nowrap",
                            isLowAvailability && 'text-coral font-medium'
                          )}>
                            {spotsLeft} {t('activities.spotsLeft')}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
