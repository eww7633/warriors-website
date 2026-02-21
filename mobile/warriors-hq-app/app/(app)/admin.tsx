import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColors } from '@/lib/theme';

export default function AdminScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  if (session.user?.role !== 'admin') {
    return (
      <Screen>
        <Title>Admin</Title>
        <Subtitle>Access restricted</Subtitle>
        <Card>
          <Text style={{ color: colors.textMuted }}>Only admin accounts can view admin tools.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Admin Tools</Title>
      <Subtitle>Hockey Ops quick actions</Subtitle>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Announcements</Text>
        <Text style={{ color: colors.textMuted }}>Create and publish club announcements for all mobile users.</Text>
        <Button label="Open Announcements" onPress={() => router.push('/(app)/announcements')} />
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Event Approval Queue</Text>
        <Text style={{ color: colors.textMuted }}>
          RSVP requests from non-rostered players are submitted from event pages. Hockey Ops approval API wiring can be added next.
        </Text>
      </Card>
    </Screen>
  );
}

