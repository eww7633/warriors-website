import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [typeFilter, setTypeFilter] = useState('all');
  const isSupporter = session.user?.role === 'supporter';
  const eventTypes = useMemo(() => ['all', ...Array.from(new Set(events.map((event) => event.eventType).filter(Boolean)))], [events]);
  const filteredEvents = useMemo(
    () => (typeFilter === 'all' ? events : events.filter((event) => event.eventType === typeFilter)),
    [events, typeFilter]
  );

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
      <Subtitle>See what is coming up{isSupporter ? '' : ' and who is signing up'}</Subtitle>
      <ErrorText message={error} />
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Filter by Type</Text>
        <View style={styles.chips}>
          {eventTypes.map((value) => {
            const selected = typeFilter === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  selected && { borderColor: colors.primary, backgroundColor: colors.secondary }
                ]}
                onPress={() => setTypeFilter(value)}
              >
                <Text style={{ color: selected ? colors.secondaryText : colors.text, fontWeight: '600' }}>
                  {value === 'all' ? 'All Types' : value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
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
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{event.title}</Text>
              <Text style={{ color: colors.textMuted }}>{new Date(event.startsAt).toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted }}>{event.location}</Text>
              <Text style={{ color: colors.textMuted }}>
                Type: {event.eventType}
                {!isSupporter ? ` · Going: ${event.goingCount} · RSVPs: ${event.reservationCount}` : ''}
              </Text>
              <Link href={`/(app)/events/${event.id}`} style={{ color: colors.link }}>
                Open detail
              </Link>
              {!isSupporter ? (
                <Link href={`/(app)/events/going/${event.id}`} style={{ color: colors.link }}>
                  Who&apos;s going
                </Link>
              ) : null}
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

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6
  }
});
