import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import type { PublicEvent } from '@/lib/types';

export default function EventsScreen() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiClient.getEvents();
        setEvents(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load events.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <Screen>
      <Title>Events</Title>
      <Subtitle>Practices, games, and team events</Subtitle>
      {loading ? <Text style={{ color: '#cbd5e1' }}>Loading...</Text> : null}
      <ErrorText message={error} />

      <ScrollView>
        <View style={{ gap: 10, paddingBottom: 16 }}>
          {events.map((event) => (
            <Card key={event.id}>
              <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 16 }}>{event.title}</Text>
              <Text style={{ color: '#cbd5e1' }}>{new Date(event.startsAt).toLocaleString()}</Text>
              <Text style={{ color: '#cbd5e1' }}>{event.location}</Text>
              <Link href={`/(app)/events/${event.id}`} style={{ color: '#60a5fa' }}>
                Open detail
              </Link>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
