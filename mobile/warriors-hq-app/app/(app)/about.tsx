import { Screen, Card, Subtitle, Title } from '@/components/ui';
import { Text } from 'react-native';
import { useThemeColors } from '@/lib/theme';

export default function AboutScreen() {
  const colors = useThemeColors();
  return (
    <Screen>
      <Title>About Warriors HQ</Title>
      <Subtitle>Version 1.0.0</Subtitle>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Purpose</Text>
        <Text style={{ color: colors.textMuted }}>
          Warriors HQ helps players, supporters, and admins manage events, RSVP, attendance check-ins, and team communication.
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Data Use</Text>
        <Text style={{ color: colors.textMuted }}>
          Account and roster data is used to provide event eligibility, attendance records, and team directory features.
        </Text>
      </Card>
    </Screen>
  );
}
