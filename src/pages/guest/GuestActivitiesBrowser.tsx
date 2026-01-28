import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, ChevronRight, Sparkles, HelpCircle, Info, Search } from 'lucide-react';
import { GuestDatePicker } from '@/components/ui/guest-date-picker';
import { GuestActivitiesLoading } from '@/components/guest/GuestLoadingSkeleton';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { GuestSectionHeader } from '@/components/guest/GuestSectionHeader';
import { cn } from '@/lib/utils';
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
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground tracking-tight">{t('activities.title')}</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors tap-target flex items-center justify-center">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p>{t('activities.noActivitiesDescription')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t('activities.subtitle')}</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('activities.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 tap-target"
        />
      </div>

      {/* Category Pills with Icons */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
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
                  <div className="flex items-start gap-3">
                    {/* Activity Image or Category Icon fallback */}
                    <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden">
                      {session.image_url ? (
                        <img 
                          src={session.image_url} 
                          alt={session.activity_name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className={cn(
                          "flex h-full w-full items-center justify-center",
                          config.bgClass
                        )}>
                          <CategoryIcon category={session.category} size={24} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-mono font-semibold text-sm", config.colorClass)}>
                            {session.start_time?.slice(0, 5)}
                          </span>
                          <CategoryBadge category={session.category} size="sm" showLabel={false} />
                        </div>
                        {session.requires_approval ? (
                          <Badge variant="pending" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />Request
                          </Badge>
                        ) : (
                          <Badge variant="confirmed" className="text-xs">Instant</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 truncate">{session.activity_name}</h3>
                      {session.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{session.description}</p>
                      )}
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {session.duration_minutes}{t('common.minutes').charAt(0)}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1",
                            isLowAvailability ? 'text-coral font-medium' : 'text-muted-foreground'
                          )}>
                            <Users className="h-3.5 w-3.5" />
                            {spotsLeft} {t('activities.spotsLeft')}
                          </span>
                        </div>
                        <ChevronRight className={cn("h-5 w-5", config.colorClass)} />
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
