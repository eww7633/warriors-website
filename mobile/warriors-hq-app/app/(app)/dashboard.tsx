import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorText, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { DashboardSummary, MobileEvent, ReservationStatus } from '@/lib/types';

const formatStatus = (status: ReservationStatus | null): string => {
  if (!status) return 'Not set';
  if (status === 'not_going') return 'Not Going';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function DashboardScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const colors = useThemeColors();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all');

  const upcoming = useMemo(
    () => [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 8),
    [events]
  );
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return upcoming;
    return upcoming.filter((event) => event.viewerReservationStatus === filter);
  }, [upcoming, filter]);

  const load = useCallback(async () => {
    if (!session.token) {
      return;
    }

    try {
      setError(null);
      const [summary, items] = await Promise.all([
        apiClient.getDashboard(session.token),
        apiClient.getEvents(session.token)
      ]);
      setDashboard(summary);
      setEvents(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load dashboard');
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRsvp = async (eventId: string, status: ReservationStatus) => {
    if (!session.token) {
      return;
    }

    try {
      setUpdatingId(eventId);
      setError(null);
      await apiClient.setRsvp(session.token, eventId, status);
      setEvents((current) =>
        current.map((entry) =>
          entry.id === eventId
            ? {
                ...entry,
                viewerReservationStatus: status,
                reservationCount: entry.viewerReservationStatus ? entry.reservationCount : entry.reservationCount + 1
              }
            : entry
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'RSVP failed');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.text} />}
    >
      <Title>Events</Title>
      <Subtitle>
        {session.user?.fullName || session.user?.email || 'Player'} · {dashboard?.stats.visibleEvents ?? events.length} visible events
      </Subtitle>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Quick Actions</Text>
        <Button label="Scan QR Check-In" variant="secondary" onPress={() => router.push('/(app)/checkin')} />
        <Button label="Full Event List" onPress={() => router.push('/(app)/events')} />
      </Card>

      <ErrorText message={error} />

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Filter</Text>
        <View style={styles.chips}>
          {(['all', 'going', 'maybe', 'not_going'] as const).map((value) => (
            <Pressable
              key={value}
              style={[
                styles.chip,
                { borderColor: colors.border },
                filter === value && { borderColor: colors.primary, backgroundColor: colors.secondary }
              ]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>
                {value === 'all' ? 'All' : value === 'not_going' ? 'Not Going' : value.charAt(0).toUpperCase() + value.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {filteredEvents.map((event) => (
        <Card key={event.id}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{event.title}</Text>
          <Text style={{ color: colors.textMuted }}>{new Date(event.startsAt).toLocaleString()}</Text>
          <Text style={{ color: colors.textMuted }}>{event.location}</Text>
          <Text style={{ color: colors.textMuted }}>
            Your RSVP: {formatStatus(event.viewerReservationStatus)} · Going: {event.goingCount} · Total RSVPs: {event.reservationCount}
          </Text>
          {event.goingMembers.length > 0 ? (
            <Text style={{ color: colors.textMuted }}>
              Going: {event.goingMembers.slice(0, 6).map((entry) => entry.fullName).join(', ')}
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted }}>Going list not available yet.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Going"
                onPress={() => onRsvp(event.id, 'going')}
                disabled={updatingId === event.id}
                loading={updatingId === event.id}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Maybe"
                variant="secondary"
                onPress={() => onRsvp(event.id, 'maybe')}
                disabled={updatingId === event.id}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Not Going"
                variant="danger"
                onPress={() => onRsvp(event.id, 'not_going')}
                disabled={updatingId === event.id}
              />
            </View>
          </View>
          <Text style={{ color: colors.link }} onPress={() => router.push(`/(app)/events/${event.id}`)}>
            Open details
          </Text>
          <Text style={{ color: colors.link }} onPress={() => router.push(`/(app)/events/going/${event.id}`)}>
            See who&apos;s going
          </Text>
          {event.locationMapUrl ? (
            <Text style={{ color: colors.link }} onPress={() => Linking.openURL(event.locationMapUrl || '')}>
              Open map
            </Text>
          ) : null}
        </Card>
      ))}

      {!filteredEvents.length && !error ? (
        <Card>
          <Text style={{ color: colors.textMuted }}>No visible events right now.</Text>
        </Card>
      ) : null}

      <Button
        label="Logout"
        variant="danger"
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login');
        }}
      />
    </ScrollView>
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
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600'
  }
});
