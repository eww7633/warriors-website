import * as Linking from 'expo-linking';
import { Screen, Card, Subtitle, Title, Button } from '@/components/ui';
import { Text } from 'react-native';
import { APP_SUPPORT_EMAIL, PRIVACY_URL } from '@/lib/env';
import { useThemeColors } from '@/lib/theme';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  return (
    <Screen>
      <Title>Privacy</Title>
      <Subtitle>How your information is handled</Subtitle>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Profile & Roster</Text>
        <Text style={{ color: colors.textMuted }}>
          Phone/email/address visibility can be controlled in Settings. Admins may view roster data for team operations.
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Notifications</Text>
        <Text style={{ color: colors.textMuted }}>
          The app sends event reminders and announcements when enabled in Settings.
        </Text>
      </Card>
      {PRIVACY_URL ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Full Privacy Policy</Text>
          <Button label="Open Privacy Policy" variant="secondary" onPress={() => Linking.openURL(PRIVACY_URL)} />
        </Card>
      ) : null}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Questions</Text>
        <Button label="Contact Support" variant="secondary" onPress={() => Linking.openURL(`mailto:${APP_SUPPORT_EMAIL}`)} />
      </Card>
    </Screen>
  );
}
