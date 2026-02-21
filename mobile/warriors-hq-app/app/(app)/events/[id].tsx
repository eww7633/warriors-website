import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, Text } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { MobileEvent, ReservationStatus } from '@/lib/types';

const renderStatus = (status: ReservationStatus | null) => {
  if (!status) return 'Not submitted';
  if (status === 'not_going') return 'Not Going';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
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
            <Text style={{ color: '#cbd5e1' }}>{event.location}</Text>
            <Text style={{ color: '#cbd5e1' }}>{event.publicDetails || 'No details.'}</Text>
            <Text style={{ color: '#cbd5e1' }}>Your RSVP: {renderStatus(event.viewerReservationStatus)}</Text>
            <Text style={{ color: '#cbd5e1' }}>Going: {event.goingCount} · Total RSVPs: {event.reservationCount}</Text>
            {event.locationMapUrl ? (
              <Text style={{ color: '#60a5fa' }} onPress={() => Linking.openURL(event.locationMapUrl || '')}>
                Open map
              </Text>
            ) : null}
          </Card>
          <Card>
            <Text style={{ color: '#f8fafc', fontWeight: '700' }}>Who is Going</Text>
            {event.goingMembers.length ? (
              event.goingMembers.map((member) => (
                <Text key={member.userId} style={{ color: '#cbd5e1' }}>
                  {member.fullName}
                </Text>
              ))
            ) : (
              <Text style={{ color: '#64748b' }}>No published going list yet.</Text>
            )}
          </Card>
          <Button label="Going" onPress={() => onRsvp('going')} loading={saving} disabled={saving} />
          <Button label="Maybe" variant="secondary" onPress={() => onRsvp('maybe')} disabled={saving} />
          <Button label="Not Going" variant="danger" onPress={() => onRsvp('not_going')} disabled={saving} />
        </ScrollView>
      ) : (
        <Text style={{ color: '#cbd5e1' }}>Loading...</Text>
      )}
    </Screen>
  );
}
