import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColors } from '@/lib/theme';

export default function AppLayout() {
  const { ready, session } = useAuth();
  const colors = useThemeColors();
  if (!ready) return null;
  if (!session.isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="events/index" options={{ title: 'Events' }} />
      <Stack.Screen name="events/[id]" options={{ title: 'Event Detail' }} />
      <Stack.Screen name="events/going/[id]" options={{ title: "Who's Going" }} />
      <Stack.Screen name="checkin" options={{ title: 'QR Check-In' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
