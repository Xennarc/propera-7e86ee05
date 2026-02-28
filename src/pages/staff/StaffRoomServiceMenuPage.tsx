/**
 * Staff Room Service Menu Management
 *
 * Tabbed admin for Categories, Items, Modifiers, Ordering Hours.
 * Role-gated: RESORT_ADMIN, MANAGER, FNB, SUPER_ADMIN only.
 * Feature-gated: enable_room_service.
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureGate } from '@/components/FeatureGate';
import { usePermissions } from '@/hooks/usePermissions';
import { LayoutList, UtensilsCrossed, Layers, Clock } from 'lucide-react';
import { RoomServiceCategoriesTab } from '@/components/room-service-menu/CategoriesTab';
import { RoomServiceItemsTab } from '@/components/room-service-menu/ItemsTab';
import { RoomServiceModifiersTab } from '@/components/room-service-menu/ModifiersTab';
import { RoomServiceHoursTab } from '@/components/room-service-menu/HoursTab';

function StaffRoomServiceMenuContent() {
  const { currentResortRole, isSuperAdmin } = usePermissions();
  const [tab, setTab] = useState('categories');

  // Role gate: only RESORT_ADMIN, MANAGER, FNB, or SUPER_ADMIN
  const allowed =
    isSuperAdmin ||
    currentResortRole === 'RESORT_ADMIN' ||
    currentResortRole === 'MANAGER' ||
    currentResortRole === 'FNB';

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <p className="text-muted-foreground text-sm">
          You don't have permission to manage the room service menu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage categories, items, modifiers, and ordering hours
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border data-[state=inactive]:bg-muted/40"
          >
            <LayoutList className="h-3 w-3" /> Categories
          </TabsTrigger>
          <TabsTrigger
            value="items"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border data-[state=inactive]:bg-muted/40"
          >
            <UtensilsCrossed className="h-3 w-3" /> Items
          </TabsTrigger>
          <TabsTrigger
            value="modifiers"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border data-[state=inactive]:bg-muted/40"
          >
            <Layers className="h-3 w-3" /> Modifiers
          </TabsTrigger>
          <TabsTrigger
            value="hours"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border data-[state=inactive]:bg-muted/40"
          >
            <Clock className="h-3 w-3" /> Hours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <RoomServiceCategoriesTab />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          <RoomServiceItemsTab />
        </TabsContent>
        <TabsContent value="modifiers" className="mt-4">
          <RoomServiceModifiersTab />
        </TabsContent>
        <TabsContent value="hours" className="mt-4">
          <RoomServiceHoursTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StaffRoomServiceMenuPage() {
  return (
    <FeatureGate requiredFlags={['enable_room_service']} mode="staff">
      <StaffRoomServiceMenuContent />
    </FeatureGate>
  );
}
