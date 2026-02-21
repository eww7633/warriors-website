import * as Linking from 'expo-linking';
import { Screen, Card, Subtitle, Title, Button } from '@/components/ui';
import { Text } from 'react-native';
import { APP_SUPPORT_EMAIL } from '@/lib/env';
import { useThemeColors } from '@/lib/theme';

export default function SupportScreen() {
  const colors = useThemeColors();
  return (
    <Screen>
      <Title>Support</Title>
      <Subtitle>Need help with the app?</Subtitle>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Contact Hockey Ops</Text>
        <Text style={{ color: colors.textMuted }}>{APP_SUPPORT_EMAIL}</Text>
        <Button label="Email Support" onPress={() => Linking.openURL(`mailto:${APP_SUPPORT_EMAIL}`)} />
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Report an Issue</Text>
        <Text style={{ color: colors.textMuted }}>
          Include device type, app version, and steps to reproduce the issue for faster support.
        </Text>
      </Card>
    </Screen>
  );
}
