import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

export default function AppLayout() {
  const { ready, session } = useAuth();
  if (!ready) return null;
  if (!session.isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#f8fafc', contentStyle: { backgroundColor: '#0b1320' } }}>
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="events/index" options={{ title: 'Events' }} />
      <Stack.Screen name="events/[id]" options={{ title: 'Event Detail' }} />
      <Stack.Screen name="events/going/[id]" options={{ title: "Who's Going" }} />
      <Stack.Screen name="checkin" options={{ title: 'QR Check-In' }} />
    </Stack>
  );
}
