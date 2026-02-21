import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { PlayerAvatar } from '@/components/player-avatar';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { usePreferences } from '@/contexts/preferences-context';
import { analytics } from '@/lib/analytics';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileUser, ThemeMode } from '@/lib/types';

const themeOptions: ThemeMode[] = ['system', 'light', 'dark'];

type ProfileDraft = {
  phone: string;
  position: string;
  pronouns: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  jerseyRequest: string;
  usaHockeyNumber: string;
  sharePhone: boolean;
  shareEmail: boolean;
  shareAddress: boolean;
};

const toDraft = (user: MobileUser | null): ProfileDraft => ({
  phone: user?.phone ?? '',
  position: user?.position ?? '',
  pronouns: user?.pronouns ?? '',
  emergencyContactName: user?.emergencyContactName ?? '',
  emergencyContactPhone: user?.emergencyContactPhone ?? '',
  jerseyRequest: user?.jerseyRequest ?? '',
  usaHockeyNumber: user?.usaHockeyNumber ?? '',
  sharePhone: user?.sharePhone ?? false,
  shareEmail: user?.shareEmail ?? false,
  shareAddress: user?.shareAddress ?? false
});

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { session, logout, updateUser, handleApiError } = useAuth();
  const { preferences, setNotificationPref, setThemeMode } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(toDraft(session.user));

  useEffect(() => {
    const loadProfile = async () => {
      if (!session.token) return;
      try {
        const profile = await apiClient.getProfile(session.token);
        await updateUser(profile);
        setDraft(toDraft(profile));
      } catch (e) {
        if (await handleApiError(e)) return;
      }
    };
    loadProfile();
  }, [session.token]);

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
      await updateUser(user);
      await analytics.track('profile_photo_updated', {}, session.token);
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Unable to upload photo.');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!session.token) return;
    setProfileBusy(true);
    setError(null);
    try {
      const user = await apiClient.updateProfile(session.token, {
        phone: draft.phone.trim() || null,
        position: draft.position.trim() || null,
        pronouns: draft.pronouns.trim() || null,
        emergencyContactName: draft.emergencyContactName.trim() || null,
        emergencyContactPhone: draft.emergencyContactPhone.trim() || null,
        jerseyRequest: draft.jerseyRequest.trim() || null,
        usaHockeyNumber: draft.usaHockeyNumber.trim() || null,
        sharePhone: draft.sharePhone,
        shareEmail: draft.shareEmail,
        shareAddress: draft.shareAddress
      });
      await updateUser(user);
      setDraft(toDraft(user));
      await analytics.track('profile_updated', {}, session.token);
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Unable to save profile.');
    } finally {
      setProfileBusy(false);
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
            role={session.user?.role}
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
        <Text style={{ color: colors.text, fontWeight: '700' }}>Player Details</Text>
        <Field value={draft.phone} placeholder="Phone" onChangeText={(value) => setDraft((prev) => ({ ...prev, phone: value }))} />
        <Field
          value={draft.position}
          placeholder="Position"
          onChangeText={(value) => setDraft((prev) => ({ ...prev, position: value }))}
        />
        <Field
          value={draft.pronouns}
          placeholder="Pronouns"
          onChangeText={(value) => setDraft((prev) => ({ ...prev, pronouns: value }))}
        />
        <Field
          value={draft.emergencyContactName}
          placeholder="Emergency contact name"
          onChangeText={(value) => setDraft((prev) => ({ ...prev, emergencyContactName: value }))}
        />
        <Field
          value={draft.emergencyContactPhone}
          placeholder="Emergency contact phone"
          onChangeText={(value) => setDraft((prev) => ({ ...prev, emergencyContactPhone: value }))}
        />
        <Field
          value={draft.jerseyRequest}
          placeholder="Jersey request (size/notes)"
          onChangeText={(value) => setDraft((prev) => ({ ...prev, jerseyRequest: value }))}
        />
        <Field
          value={draft.usaHockeyNumber}
          placeholder="USA Hockey number"
          onChangeText={(value) => setDraft((prev) => ({ ...prev, usaHockeyNumber: value }))}
        />
        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>Directory Privacy</Text>
        <View style={styles.row}>
          <Text style={{ color: colors.textMuted }}>Share phone with team</Text>
          <Switch value={draft.sharePhone} onValueChange={(value) => setDraft((prev) => ({ ...prev, sharePhone: value }))} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textMuted }}>Share email with team</Text>
          <Switch value={draft.shareEmail} onValueChange={(value) => setDraft((prev) => ({ ...prev, shareEmail: value }))} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: colors.textMuted }}>Share address with team</Text>
          <Switch value={draft.shareAddress} onValueChange={(value) => setDraft((prev) => ({ ...prev, shareAddress: value }))} />
        </View>
        <Button label="Save Profile" onPress={saveProfile} loading={profileBusy} disabled={profileBusy} />
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

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{session.user?.role === 'admin' ? 'Roster' : 'Team Directory'}</Text>
        <Text style={{ color: colors.textMuted }}>
          {session.user?.role === 'admin'
            ? 'View and contact roster members with admin filters and actions.'
            : 'View teammate contact info where they shared privacy permissions.'}
        </Text>
        <Button label="Open Team Directory" variant="secondary" onPress={() => router.push('/(app)/team')} />
      </Card>

      {session.user?.role === 'admin' ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Admin View</Text>
          <Text style={{ color: colors.textMuted }}>Open Hockey Ops mobile admin tools.</Text>
          <Button label="Open Admin Tools" variant="secondary" onPress={() => router.push('/(app)/admin')} />
        </Card>
      ) : null}

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>App Info</Text>
        <Button label="Privacy" variant="secondary" onPress={() => router.push('/(app)/privacy')} />
        <Button label="Support" variant="secondary" onPress={() => router.push('/(app)/support')} />
        <Button label="About" variant="secondary" onPress={() => router.push('/(app)/about')} />
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
