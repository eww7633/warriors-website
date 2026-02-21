import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PlayerAvatar } from '@/components/player-avatar';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileEvent, ReservationStatus } from '@/lib/types';

const renderStatus = (status: ReservationStatus | null) => {
  if (!status) return 'Not submitted';
  if (status === 'not_going') return 'Not Going';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const colors = useThemeColors();
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!params.id) throw new Error('Missing event id');
      if (!session.token) throw new Error('Session missing. Please sign in again.');
      setEvent(await apiClient.getEventDetail(session.token, params.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Event unavailable');
    }
  }, [params.id, session.token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRsvp = async (status: ReservationStatus) => {
    try {
      if (!params.id) throw new Error('Missing event id');
      if (!session.token) throw new Error('Session missing. Please sign in again.');
      setSaving(true);
      await apiClient.setRsvp(session.token, params.id, status);
      setEvent((prev) => (prev ? { ...prev, viewerReservationStatus: status } : prev));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'RSVP failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ErrorText message={error} />
      {event ? (
        <ScrollView>
          <Card>
            <Title>{event.title}</Title>
            <Subtitle>{new Date(event.startsAt).toLocaleString()}</Subtitle>
            <Text style={{ color: colors.textMuted }}>{event.location}</Text>
            <Text style={{ color: colors.textMuted }}>{event.publicDetails || 'No details.'}</Text>
            <Text style={{ color: colors.textMuted }}>Your RSVP: {renderStatus(event.viewerReservationStatus)}</Text>
            <Text style={{ color: colors.textMuted }}>Going: {event.goingCount} · Total RSVPs: {event.reservationCount}</Text>
            {event.locationMapUrl ? (
              <Text style={{ color: colors.link }} onPress={() => Linking.openURL(event.locationMapUrl || '')}>
                Open map
              </Text>
            ) : null}
          </Card>
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Who is Going</Text>
            {event.goingMembers.length ? (
              event.goingMembers.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  <PlayerAvatar
                    fullName={member.fullName}
                    jerseyNumber={member.jerseyNumber}
                    avatarUrl={member.avatarUrl}
                    seed={member.userId}
                    size={32}
                  />
                  <Text style={{ color: colors.textMuted }}>
                    {member.fullName}
                    {member.jerseyNumber ? ` · #${member.jerseyNumber}` : ''}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textMuted }}>No published going list yet.</Text>
            )}
            <Text
              style={{ color: colors.link, marginTop: 4 }}
              onPress={() => {
                if (params.id) {
                  router.push(`/(app)/events/going/${params.id}`);
                }
              }}
            >
              Use dedicated going list view
            </Text>
          </Card>
          <Button label="Going" onPress={() => onRsvp('going')} loading={saving} disabled={saving} />
          <Button label="Maybe" variant="secondary" onPress={() => onRsvp('maybe')} disabled={saving} />
          <Button label="Not Going" variant="danger" onPress={() => onRsvp('not_going')} disabled={saving} />
        </ScrollView>
      ) : (
        <Text style={{ color: colors.textMuted }}>Loading...</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  }
});
