import { Link } from 'react-router-dom';
import { GUEST_ROUTES, guestPath } from '@/routes/guestRoutes';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GuestSectionHeader } from './GuestSectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@/integrations/supabase/types';

type ActivityCategory = Database['public']['Enums']['activity_category'];

interface GuestFeaturedActivitiesProps {
  resortId: string;
}

const FALLBACK_ACTIVITY_IMAGES: Record<string, string> = {
  DIVE: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
  WATERSPORT: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=400&q=80',
  EXCURSION: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
  SPA: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80',
  OTHER: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
};

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80';

export function GuestFeaturedActivities({ resortId }: GuestFeaturedActivitiesProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['guest-featured-activities', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, name, category, image_url, short_description')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .eq('guest_can_book', true)
        .not('image_url', 'is', null)
        .limit(4);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!resortId,
  });

  // Don't render if no activities with images
  if (!isLoading && (!activities || activities.length === 0)) {
    return null;
  }

  const getImageUrl = (activity: { image_url: string | null; category: ActivityCategory }) => {
    if (activity.image_url) return activity.image_url;
    return FALLBACK_ACTIVITY_IMAGES[activity.category] || DEFAULT_FALLBACK;
  };

  if (isLoading) {
    return (
      <div>
        <GuestSectionHeader
          title="Explore Activities"
          icon={<Sparkles className="h-5 w-5 text-primary" />}
        />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <GuestSectionHeader
        title="Explore Activities"
        icon={<Sparkles className="h-5 w-5 text-primary" />}
        actionLabel="View All"
        actionHref="/guest/activities"
      />
      <div className="grid grid-cols-2 gap-3">
        {activities?.map((activity) => (
          <Link key={activity.id} to={`/guest/activity/${activity.id}`}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden group">
              <img
                src={getImageUrl(activity)}
                alt={activity.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="text-white font-bold text-sm line-clamp-1">
                  {activity.name}
                </h4>
                {activity.short_description && (
                  <p className="text-white/80 text-xs line-clamp-1">
                    {activity.short_description}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
