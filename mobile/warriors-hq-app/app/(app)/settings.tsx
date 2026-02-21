import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { PlayerAvatar } from '@/components/player-avatar';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { usePreferences } from '@/contexts/preferences-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { ThemeMode } from '@/lib/types';

const themeOptions: ThemeMode[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { session, logout, updateUser } = useAuth();
  const { preferences, setNotificationPref, setThemeMode } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = async () => {
    if (!session.token) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library permission is required.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8
      });

      if (result.canceled || !result.assets.length) {
        setBusy(false);
        return;
      }

      const user = await apiClient.uploadProfilePhoto(session.token, result.assets[0].uri);
      await updateUser({ avatarUrl: user.avatarUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to upload photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <Subtitle>Manage your preferences</Subtitle>
      <ErrorText message={error} />

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Profile</Text>
        <View style={styles.profileRow}>
          <PlayerAvatar
            fullName={session.user?.fullName || 'User'}
            jerseyNumber={session.user?.jerseyNumber ?? null}
            avatarUrl={session.user?.avatarUrl ?? null}
            seed={session.user?.id || session.user?.email || 'user'}
            size={52}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{session.user?.fullName}</Text>
            <Text style={{ color: colors.textMuted }}>{session.user?.email}</Text>
          </View>
        </View>
        <Button label={busy ? 'Uploading...' : 'Update Photo'} onPress={uploadPhoto} disabled={busy} loading={busy} />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Notifications</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textMuted }}>Event reminders</Text>
          <Switch
            value={preferences.notifications.eventReminders}
            onValueChange={(value) => setNotificationPref('eventReminders', value)}
          />
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textMuted }}>Announcements</Text>
          <Switch
            value={preferences.notifications.announcements}
            onValueChange={(value) => setNotificationPref('announcements', value)}
          />
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Appearance</Text>
        <View style={styles.chips}>
          {themeOptions.map((option) => {
            const selected = preferences.themeMode === option;
            return (
              <Pressable
                key={option}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  selected && { borderColor: colors.primary, backgroundColor: colors.secondary }
                ]}
                onPress={() => setThemeMode(option)}
              >
                <Text style={{ color: selected ? colors.secondaryText : colors.text, fontWeight: '600' }}>
                  {option === 'system' ? 'Match System' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button label="Log Out" variant="danger" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6
  }
});
