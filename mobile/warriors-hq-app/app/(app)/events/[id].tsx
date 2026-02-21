import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PlayerAvatar } from '@/components/player-avatar';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { addEventToCalendar } from '@/lib/calendar';
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
  const { session, handleApiError } = useAuth();
  const colors = useThemeColors();
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isSupporter = session.user?.role === 'supporter';

  const load = useCallback(async () => {
    try {
      if (!params.id) throw new Error('Missing event id');
      if (!session.token) throw new Error('Session missing. Please sign in again.');
      setEvent(await apiClient.getEventDetail(session.token, params.id));
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Event unavailable');
    }
  }, [params.id, session.token, handleApiError]);

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
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'RSVP failed');
    } finally {
      setSaving(false);
    }
  };

  const onRequestApproval = async () => {
    try {
      if (!params.id) throw new Error('Missing event id');
      if (!session.token) throw new Error('Session missing. Please sign in again.');
      setSaving(true);
      await apiClient.requestRsvpApproval(session.token, params.id);
      setError('RSVP request submitted for approval.');
      await load();
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'RSVP request failed');
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
            {!isSupporter ? <Text style={{ color: colors.textMuted }}>Your RSVP: {renderStatus(event.viewerReservationStatus)}</Text> : null}
            <Text style={{ color: colors.textMuted }}>
              Type: {event.eventType}
              {!isSupporter ? ` · Going: ${event.goingCount} · Total RSVPs: ${event.reservationCount}` : ''}
            </Text>
            {!isSupporter && event.isOnIceEvent && !event.viewerCanRsvp ? (
              <Text style={{ color: colors.textMuted }}>
                You are not rostered for this team{event.teamLabel ? ` (${event.teamLabel})` : ''}. Submit an RSVP request for Hockey Ops approval.
              </Text>
            ) : null}
            {event.locationMapUrl ? (
              <Text style={{ color: colors.link }} onPress={() => Linking.openURL(event.locationMapUrl || '')}>
                Open map
              </Text>
            ) : null}
            <Button
              label="Add to Calendar"
              variant="secondary"
              onPress={async () => {
                try {
                  await addEventToCalendar(event);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unable to add event to calendar');
                }
              }}
            />
          </Card>
          {!isSupporter ? (
            <>
              <Card>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Who is Going</Text>
                {event.goingMembers.length ? (
                  event.goingMembers.map((member) => (
                    <View key={member.userId} style={styles.memberRow}>
                      <PlayerAvatar
                        fullName={member.fullName}
                        jerseyNumber={member.jerseyNumber}
                        avatarUrl={member.avatarUrl}
                        role={member.role}
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
              {event.viewerCanRsvp ? (
                <>
                  <Button label="Going" onPress={() => onRsvp('going')} loading={saving} disabled={saving} />
                  <Button label="Maybe" variant="secondary" onPress={() => onRsvp('maybe')} disabled={saving} />
                  <Button label="Not Going" variant="danger" onPress={() => onRsvp('not_going')} disabled={saving} />
                </>
              ) : (
                <Button label="Request RSVP Approval" variant="secondary" onPress={onRequestApproval} loading={saving} disabled={saving} />
              )}
            </>
          ) : null}
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
