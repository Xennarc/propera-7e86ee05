import { useState, useEffect, useCallback } from 'react';
import { useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  isFlagEnabled: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useGuestPushNotifications(
  guestId?: string,
  resortId?: string
): PushNotificationState {
  const flags = useFeatureFlagAccessSafe();
  const isFlagEnabled = flags?.isEnabledEffective('enable_guest_push_notifications') ?? false;

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isSupported ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported || !isFlagEnabled) return;
    navigator.serviceWorker.ready.then((reg) => {
      (reg as any).pushManager?.getSubscription?.().then((sub: any) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported, isFlagEnabled]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !guestId || !resortId) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      // Get VAPID public key from env (will be set when VAPID keys are configured)
      const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('[Push] VAPID public key not configured');
        return false;
      }

      const subscription = await (reg as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const subJson = subscription.toJSON();
      const keys = subJson.keys as Record<string, string>;

      // Save via RPC
      const { error } = await supabase.rpc('guest_save_push_subscription', {
        p_guest_id: guestId,
        p_resort_id: resortId,
        p_endpoint: subJson.endpoint!,
        p_p256dh: keys.p256dh,
        p_auth: keys.auth,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('[Push] Failed to save subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('[Push] Error requesting permission:', e);
      return false;
    }
  }, [isSupported, guestId, resortId]);

  return { isSupported, isFlagEnabled, permission, isSubscribed, requestPermission };
}
