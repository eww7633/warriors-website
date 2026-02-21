import { Redirect, Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="events/index"
        options={{
          title: 'Schedule',
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarLabel: 'Team',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announcements',
          tabBarLabel: 'Announcements',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen name="events/[id]" options={{ href: null, title: 'Event Detail' }} />
      <Tabs.Screen name="events/going/[id]" options={{ href: null, title: "Who's Going" }} />
      <Tabs.Screen name="checkin" options={{ href: null, title: 'QR Check-In' }} />
      <Tabs.Screen name="admin" options={{ href: null, title: 'Admin' }} />
    </Tabs>
  );
}
