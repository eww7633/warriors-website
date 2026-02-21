import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PlayerAvatar } from '@/components/player-avatar';
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const isSupporter = session.user?.role === 'supporter';

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((event) => (showPastEvents ? true : new Date(event.startsAt).getTime() >= now))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, 8);
  }, [events, showPastEvents]);
  const filteredEvents = useMemo(() => {
    const byRsvp = filter === 'all' ? upcoming : upcoming.filter((event) => event.viewerReservationStatus === filter);
    if (typeFilter === 'all') return byRsvp;
    return byRsvp.filter((event) => event.eventType === typeFilter);
  }, [upcoming, filter, typeFilter]);
  const eventTypes = useMemo(() => ['all', ...Array.from(new Set(events.map((event) => event.eventType).filter(Boolean)))], [events]);

  const load = useCallback(async () => {
    if (!session.token) {
      return;
    }

    try {
      setError(null);
      const items = await apiClient.getEvents(session.token);
      setEvents(items);

      try {
        const summary = await apiClient.getDashboard(session.token);
        setDashboard(summary);
      } catch (dashboardErr) {
        setDashboard(null);
        setError(dashboardErr instanceof Error ? dashboardErr.message : 'Dashboard summary unavailable');
      }
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

  const onRequestApproval = async (eventId: string) => {
    if (!session.token) return;
    try {
      setUpdatingId(eventId);
      setError(null);
      await apiClient.requestRsvpApproval(session.token, eventId);
      setError('RSVP request submitted for approval.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit RSVP request');
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
      <Card>
        <View style={styles.profileRow}>
          <View style={styles.profileIdentity}>
            <PlayerAvatar
              fullName={session.user?.fullName || 'User'}
              jerseyNumber={session.user?.jerseyNumber ?? null}
              avatarUrl={session.user?.avatarUrl ?? null}
              role={session.user?.role}
              size={54}
            />
            <View style={{ flex: 1 }}>
              <Title>{session.user?.fullName || session.user?.email || 'Player'}</Title>
              <Subtitle>
                {isSupporter ? 'Supporter View' : 'Player View'} · {dashboard?.stats.visibleEvents ?? events.length} visible events
              </Subtitle>
            </View>
          </View>
          <Pressable style={[styles.settingsButton, { borderColor: colors.border }]} onPress={() => router.push('/(app)/settings')}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>⚙</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Quick Actions</Text>
        {!isSupporter ? <Button label="Scan QR Check-In" variant="secondary" onPress={() => router.push('/(app)/checkin')} /> : null}
        <Button label="Full Event List" onPress={() => router.push('/(app)/events')} />
      </Card>

      <ErrorText message={error} />

      <Card>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Filter</Text>
        {!isSupporter ? (
          <View style={styles.chips}>
            {(['all', 'going', 'maybe', 'not_going'] as const).map((value) => {
              const selected = filter === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    selected && { borderColor: colors.primary, backgroundColor: colors.secondary }
                  ]}
                  onPress={() => setFilter(value)}
                >
                  <Text style={[styles.chipText, { color: selected ? colors.secondaryText : colors.text }]}>
                    {value === 'all' ? 'All' : value === 'not_going' ? 'Not Going' : value.charAt(0).toUpperCase() + value.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted }}>Supporter accounts can filter by event type.</Text>
        )}
        <View style={[styles.chips, { marginTop: 8 }]}>
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
                <Text style={[styles.chipText, { color: selected ? colors.secondaryText : colors.text }]}>
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

      {filteredEvents.map((event) => (
        <Card key={event.id}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{event.title}</Text>
          <Text style={{ color: colors.textMuted }}>{new Date(event.startsAt).toLocaleString()}</Text>
          <Text style={{ color: colors.textMuted }}>{event.location}</Text>
          <Text style={{ color: colors.textMuted }}>
            {!isSupporter ? `Your RSVP: ${formatStatus(event.viewerReservationStatus)} · ` : ''}
            Type: {event.eventType}
            {!isSupporter ? ` · Going: ${event.goingCount} · Total RSVPs: ${event.reservationCount}` : ''}
          </Text>
          {!isSupporter && event.isOnIceEvent && !event.viewerCanRsvp ? (
            <Text style={{ color: colors.textMuted }}>
              Eligible roster required{event.teamLabel ? ` (${event.teamLabel})` : ''}. You can submit a request for Hockey Ops review.
            </Text>
          ) : null}
          {!isSupporter && event.goingMembers.length > 0 ? (
            <View style={styles.memberPreviewWrap}>
              {event.goingMembers.slice(0, 6).map((entry) => (
                <View key={`${event.id}-${entry.userId}`} style={styles.memberPreview}>
                  <PlayerAvatar
                    fullName={entry.fullName}
                    jerseyNumber={entry.jerseyNumber}
                    avatarUrl={entry.avatarUrl}
                    role={entry.role}
                    size={30}
                  />
                  <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {entry.fullName}
                  </Text>
                </View>
              ))}
            </View>
          ) : !isSupporter ? (
            <Text style={{ color: colors.textMuted }}>Going list not available yet.</Text>
          ) : null}
          {!isSupporter && event.viewerCanRsvp ? (
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
          ) : null}
          {!isSupporter && !event.viewerCanRsvp ? (
            <Button
              label="Request RSVP Approval"
              variant="secondary"
              onPress={() => onRequestApproval(event.id)}
              disabled={updatingId === event.id}
              loading={updatingId === event.id}
            />
          ) : null}
          <Text style={{ color: colors.link }} onPress={() => router.push(`/(app)/events/${event.id}`)}>
            Open details
          </Text>
          {!isSupporter ? (
            <Text style={{ color: colors.link }} onPress={() => router.push(`/(app)/events/going/${event.id}`)}>
              See who&apos;s going
            </Text>
          ) : null}
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
  },
  memberPreviewWrap: {
    gap: 6
  },
  memberPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  settingsButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  toggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});
