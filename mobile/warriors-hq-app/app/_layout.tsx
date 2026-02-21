import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '@/contexts/auth-context';
import { PreferencesProvider } from '@/contexts/preferences-context';
import { analytics } from '@/lib/analytics';
import { hydrateFeatureFlags } from '@/lib/feature-flags';
import { initMonitoring } from '@/lib/monitoring';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const boot = async () => {
      await hydrateFeatureFlags();
      await initMonitoring();
    };
    boot();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as never);
      }
      analytics.track('notification_opened', { route: typeof route === 'string' ? route : null });
    });
    return () => sub.remove();
  }, [router]);

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
