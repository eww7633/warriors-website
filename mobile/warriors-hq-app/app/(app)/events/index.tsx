import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileEvent } from '@/lib/types';

export default function EventsScreen() {
  const { session } = useAuth();
  const colors = useThemeColors();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session.token) return;

    try {
      setError(null);
      setEvents(await apiClient.getEvents(session.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Events unavailable');
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Title>All Events</Title>
      <Subtitle>See what is coming up and who is signing up</Subtitle>
      <ErrorText message={error} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.text}
          />
        }
      >
        <View style={{ gap: 10, paddingBottom: 16 }}>
          {events.map((event) => (
            <Card key={event.id}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{event.title}</Text>
              <Text style={{ color: colors.textMuted }}>{new Date(event.startsAt).toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted }}>{event.location}</Text>
              <Text style={{ color: colors.textMuted }}>Going: {event.goingCount} · RSVPs: {event.reservationCount}</Text>
              <Link href={`/(app)/events/${event.id}`} style={{ color: colors.link }}>
                Open detail
              </Link>
              <Link href={`/(app)/events/going/${event.id}`} style={{ color: colors.link }}>
                Who&apos;s going
              </Link>
              {event.locationMapUrl ? (
                <Text style={{ color: colors.link }} onPress={() => Linking.openURL(event.locationMapUrl || '')}>
                  Open map
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
