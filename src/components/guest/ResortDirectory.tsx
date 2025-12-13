import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface DirectoryEntry {
  id: string;
  name: string;
  phone_number: string;
  description: string | null;
  category: string;
}

export function ResortDirectory() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['resort-directory', guest?.resortId],
    queryFn: async () => {
      if (!guest?.resortId) return [];
      
      const { data, error } = await supabase
        .from('resort_directory')
        .select('id, name, phone_number, description, category')
        .eq('resort_id', guest.resortId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as DirectoryEntry[];
    },
    enabled: !!guest?.resortId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            {t('profile.directory', 'Resort Directory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          {t('profile.directory', 'Resort Directory')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <a
            key={entry.id}
            href={`tel:${entry.phone_number}`}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{entry.name}</p>
                {entry.description && (
                  <p className="text-xs text-muted-foreground">{entry.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <span className="text-sm font-medium">{entry.phone_number}</span>
              <Phone className="h-4 w-4" />
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
