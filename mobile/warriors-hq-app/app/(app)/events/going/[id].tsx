import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileEvent } from '@/lib/types';

type SortMode = 'priority' | 'alpha';

const isGoalie = (value: string | null): boolean => {
  if (!value) return false;
  return value.toLowerCase().includes('goal');
};

export default function GoingListScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const colors = useThemeColors();
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('priority');

  const load = useCallback(async () => {
    try {
      if (!params.id) throw new Error('Missing event id');
      if (!session.token) throw new Error('Session missing. Please sign in again.');
      setEvent(await apiClient.getEventDetail(session.token, params.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load going list');
    }
  }, [params.id, session.token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!event) return [];

    const normalizedQuery = query.trim().toLowerCase();
    const matches = event.goingMembers.filter((member) =>
      !normalizedQuery ? true : member.fullName.toLowerCase().includes(normalizedQuery)
    );

    if (sortMode === 'alpha') {
      return [...matches].sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return [...matches].sort((a, b) => {
      const aWeight = (a.isManager ? 0 : 1) + (isGoalie(a.requestedPosition) ? 0 : 2);
      const bWeight = (b.isManager ? 0 : 1) + (isGoalie(b.requestedPosition) ? 0 : 2);
      if (aWeight !== bWeight) return aWeight - bWeight;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [event, query, sortMode]);

  return (
    <Screen>
      <Title>Who&apos;s Going</Title>
      <Subtitle>{event ? `${event.title} · ${event.goingCount} going` : 'Loading...'}</Subtitle>
      <ErrorText message={error} />

      <Card>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search players"
          placeholderTextColor={colors.textMuted}
          style={[styles.search, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        />
        <View style={styles.row}>
          <Pressable
            style={[
              styles.chip,
              { borderColor: colors.border },
              sortMode === 'priority' && { borderColor: colors.primary, backgroundColor: colors.secondary }
            ]}
            onPress={() => setSortMode('priority')}
          >
            <Text style={[styles.chipText, { color: colors.text }]}>Manager/Goalie First</Text>
          </Pressable>
          <Pressable
            style={[
              styles.chip,
              { borderColor: colors.border },
              sortMode === 'alpha' && { borderColor: colors.primary, backgroundColor: colors.secondary }
            ]}
            onPress={() => setSortMode('alpha')}
          >
            <Text style={[styles.chipText, { color: colors.text }]}>Alphabetical</Text>
          </Pressable>
        </View>
      </Card>

      <ScrollView>
        <View style={{ gap: 10, paddingBottom: 16 }}>
          {filtered.map((member) => (
            <Card key={member.userId}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{member.fullName}</Text>
              <Text style={{ color: colors.textMuted }}>
                {member.isManager ? 'Manager' : 'Player'}
                {member.requestedPosition ? ` · ${member.requestedPosition}` : ''}
              </Text>
            </Card>
          ))}
          {event && !filtered.length ? (
            <Card>
              <Text style={{ color: colors.textMuted }}>No matching players.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
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
  chipText: {
    fontWeight: '600',
    fontSize: 12
  }
});
