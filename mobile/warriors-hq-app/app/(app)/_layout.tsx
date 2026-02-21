import { Redirect, Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { WarriorsLogo } from '@/components/warriors-logo';
import { useThemeColors } from '@/lib/theme';

export default function AppLayout() {
  const { ready, session } = useAuth();
  const colors = useThemeColors();
  if (!ready) return null;
  if (!session.isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <WarriorsLogo size={22} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Warriors HQ</Text>
          </View>
        ),
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background }
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="events/index" options={{ title: 'Schedule', tabBarLabel: 'Schedule' }} />
      <Tabs.Screen name="announcements" options={{ title: 'Announcements', tabBarLabel: 'Announcements' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarLabel: 'Settings' }} />
      <Tabs.Screen name="events/[id]" options={{ href: null, title: 'Event Detail' }} />
      <Tabs.Screen name="events/going/[id]" options={{ href: null, title: "Who's Going" }} />
      <Tabs.Screen name="checkin" options={{ href: null, title: 'QR Check-In' }} />
    </Tabs>
  );
}
