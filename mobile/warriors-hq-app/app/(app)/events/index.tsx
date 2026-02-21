import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { addEventToCalendar, openCalendarSubscription } from '@/lib/calendar';
import { useThemeColors } from '@/lib/theme';
import type { MobileEvent } from '@/lib/types';

export default function EventsScreen() {
  const { session, handleApiError } = useAuth();
  const colors = useThemeColors();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const isSupporter = session.user?.role === 'supporter';
  const eventTypes = useMemo(() => ['all', ...Array.from(new Set(events.map((event) => event.eventType).filter(Boolean)))], [events]);
  const filteredEvents = useMemo(
    () => {
      const now = Date.now();
      const futureFiltered = events.filter((event) => (showPastEvents ? true : new Date(event.startsAt).getTime() >= now));
      const typed = typeFilter === 'all' ? futureFiltered : futureFiltered.filter((event) => event.eventType === typeFilter);
      return typed.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    },
    [events, showPastEvents, typeFilter]
  );

  const load = useCallback(async () => {
    if (!session.token) return;

    try {
      setError(null);
      setEvents(await apiClient.getEvents(session.token));
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Events unavailable');
    }
  }, [session.token, handleApiError]);

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
        <View style={styles.toggleRow}>
          <Text style={{ color: colors.textMuted }}>Show past events</Text>
          <Switch value={showPastEvents} onValueChange={setShowPastEvents} />
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
          ))}
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Calendar Sync</Text>
            <Text style={{ color: colors.textMuted }}>Subscribe to the Warriors schedule calendar in your preferred app.</Text>
            <Button
              label="Open Subscription Link"
              variant="secondary"
              onPress={async () => {
                try {
                  await openCalendarSubscription();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Subscription link unavailable');
                }
              }}
            />
          </Card>
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
  },
  toggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});
