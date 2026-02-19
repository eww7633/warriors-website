import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import type { EventDetail } from '@/lib/types';

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!params.id) {
        setError('Missing event id.');
        setLoading(false);
        return;
      }

      try {
        const detail = await apiClient.getEventDetail(params.id);
        setEvent(detail);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load event.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [params.id]);

  const onRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!params.id) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient.setRsvp(params.id, status);
      setEvent((current) => (current ? { ...current, userReservationStatus: status } : current));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save RSVP.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {loading ? <Text style={{ color: '#cbd5e1' }}>Loading event...</Text> : null}
      <ErrorText message={error} />

      {event ? (
        <ScrollView>
          <Card>
            <Title>{event.title}</Title>
            <Subtitle>{new Date(event.startsAt).toLocaleString()}</Subtitle>
            <Text style={{ color: '#cbd5e1' }}>{event.location}</Text>
            <Text style={{ color: '#cbd5e1' }}>{event.publicDetails || 'No additional details.'}</Text>
            <Text style={{ color: '#cbd5e1' }}>
              RSVP: {event.userReservationStatus ? event.userReservationStatus : 'Not submitted'}
            </Text>
          </Card>

          <Button label="Going" onPress={() => onRsvp('going')} loading={saving} />
          <Button label="Maybe" variant="secondary" onPress={() => onRsvp('maybe')} loading={saving} />
          <Button label="Not Going" variant="danger" onPress={() => onRsvp('not_going')} loading={saving} />
        </ScrollView>
      ) : null}
    </Screen>
  );
}
