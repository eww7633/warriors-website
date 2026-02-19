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

  useEffect(() => {
    const run = async () => {
      try {
        if (!params.id) throw new Error('Missing event id');
        setEvent(await apiClient.getEventDetail(params.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Event unavailable');
      }
    };
    run();
  }, [params.id]);

  const onRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    try {
      if (!params.id) throw new Error('Missing event id');
      await apiClient.setRsvp(params.id, status);
      setEvent((prev) => prev ? { ...prev, userReservationStatus: status } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'RSVP failed');
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
            <Text style={{ color: '#cbd5e1' }}>RSVP: {event.userReservationStatus ?? 'Not submitted'}</Text>
          </Card>
          <Button label="Going" onPress={() => onRsvp('going')} />
          <Button label="Maybe" variant="secondary" onPress={() => onRsvp('maybe')} />
          <Button label="Not Going" variant="danger" onPress={() => onRsvp('not_going')} />
        </ScrollView>
      ) : <Text style={{ color: '#cbd5e1' }}>Loading...</Text>}
    </Screen>
  );
}
