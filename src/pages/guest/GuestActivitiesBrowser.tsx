import { useState, useEffect } from 'react';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, Sparkles, HelpCircle, Search, X } from 'lucide-react';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { GuestActivitiesLoading } from '@/components/guest/GuestLoadingSkeleton';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { cn } from '@/lib/utils';
import { CategoryChip, CategoryIcon } from '@/components/ui/category-badge';
import { coreActivityCategories, ActivityCategoryKey, getCategoryConfig } from '@/lib/activity-category-config';
import { Input } from '@/components/ui/input';

export default function GuestActivitiesBrowser() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  // Track scroll for header collapse
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const handleScroll = () => setIsHeaderCompact(mainEl.scrollTop > 60);
    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

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
    <GuestPageShell>
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Collapsible Sticky Header */}
      <div className={cn(
        "guest-sticky-header",
        isHeaderCompact && "is-compact"
      )}>
        <div className={cn(
          "transition-all duration-200",
          isHeaderCompact ? "flex items-center justify-between" : "mb-3"
        )}>
          <div>
            <h1 className={cn(
              "font-bold text-foreground transition-all",
              isHeaderCompact ? "text-base" : "text-xl"
            )}>
              {isHeaderCompact ? t('activities.title') : t('activities.title')}
            </h1>
            {!isHeaderCompact && (
              <p className="text-sm text-muted-foreground mt-0.5">{t('activities.subtitle')}</p>
            )}
          </div>
          {isHeaderCompact && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
              {format(new Date(selectedDate), 'EEE, MMM d')}
            </span>
          )}
        </div>

        {/* Category Chips */}
        <div className="relative scroll-fade-x">
          <div className="guest-chip-row mt-2">
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
      </div>

      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder={t('activities.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 h-11 tap-target focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:shadow-md focus-visible:shadow-primary/10"
        />
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
    </GuestPageShell>
  );
}
